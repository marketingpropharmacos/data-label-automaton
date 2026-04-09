"""
Agente de Impressão Local Robusto - ProPharmacos V3.0
------------------------------------------------------------
Compatível com servidor.py (proxy central).
Protocolo PPLA modo milímetros (Argox OS-2140) conforme documentação oficial.
Melhorias V3.0: modo mm, comandos M/C/R configuráveis, encoding cp1252.

Layouts: AMP_CX, AMP10, A_PAC_PEQ, A_PAC_GRAN, TIRZ
Porta: 5001
Instalação: pip install flask flask-cors pywin32
"""

import os
import platform
import re
import logging
import socket
import sys
import time
import threading
import json
import urllib.request
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional, Tuple
from flask import Flask, jsonify, request
from flask_cors import CORS

# Logging para debug
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s [%(levelname)s] %(message)s',
    handlers=[
        logging.FileHandler("agente_impressao.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

try:
    import win32print
    PYWIN32_OK = True
except ImportError:
    PYWIN32_OK = False
    logger.warning("Biblioteca 'pywin32' não encontrada. Modo de simulação ativo.")

app = Flask("agente_impressao_v3")
CORS(app)

IMPRESSORA_PADRAO = "PEQUENO"

# ============================================
# Configurações de dimensão por impressora (em mm e dots)
# Coordenadas PPLA em 0.1mm (modo 'm')
# ============================================
PRINTER_CONFIGS = {
    'PEQUEN': {
        'largura_mm': 35, 'altura_mm': 25,
        'largura_dots': 282, 'altura_dots': 203, 'gap_dots': 24,
        'cols_max': 28,  # 20 CPP × 1,39pol = 27,8 ≈ 28 colunas (FC real)
        # Y em dots (8 LPP × 203 dots = 25 dots/linha, origem bottom-left)
        'y_positions_mm': [188, 163, 138, 113, 88, 63, 38, 13],
        'font': 1,
    },
    'GRAND': {
        'largura_mm': 109, 'altura_mm': 25,
        'largura_dots': 873, 'altura_dots': 200, 'gap_dots': 24,
        'cols_max': 73,
        'y_positions_mm': [220, 190, 160, 130, 100, 70, 40, 20],
        'font': 2,
    },
    'AMP10': {
        'largura_mm': 89, 'altura_mm': 38,
        'largura_dots': 711, 'altura_dots': 305, 'gap_dots': 24,
        'cols_max': 65,
        'y_positions_mm': [350, 310, 270, 230, 190, 150, 110, 70, 40, 20],
        'font': 1,
        'form_length': 289,
    },
    'A_PAC_GRAN': {
        'largura_mm': 76, 'altura_mm': 25,
        'largura_dots': 608, 'altura_dots': 200, 'gap_dots': 24,
        'cols_max': 57,
        'y_positions_mm': [98, 84, 70, 57, 43, 29, 15, 2],
        'font': 1,
    },
    'AMP_CX': {
        'largura_mm': 109, 'altura_mm': 25,
        'largura_dots': 873, 'altura_dots': 200, 'gap_dots': 24,
        'cols_max': 73,
        'font': 9,
    },
}

# Mapeamento direto layout_tipo → config (não depende do nome Windows da impressora)
LAYOUT_TO_CONFIG = {
    'AMP10': 'AMP10',
    'AMP_CX': 'AMP_CX',
    'A_PAC_PEQ': 'PEQUEN',
    'A_PAC_GRAN': 'A_PAC_GRAN',
    'TIRZ': 'PEQUEN',
}

def get_printer_dims(nome_impressora):
    """Seleciona dimensões baseado no nome da impressora."""
    nome = (nome_impressora or '').upper()
    if 'AMP10' in nome or 'AMPOLA 10' in nome:
        return PRINTER_CONFIGS['AMP10']
    if 'AMP_CX' in nome or 'AMPCX' in nome or 'AMP CX' in nome or 'AMP.CX' in nome:
        return PRINTER_CONFIGS['AMP_CX']
    for chave, dims in PRINTER_CONFIGS.items():
        if chave in nome:
            return dims
    return PRINTER_CONFIGS['PEQUEN']

def get_dims_by_layout(layout_tipo, fallback_impressora=None):
    """Resolve dimensões pelo layout_tipo (confiável) em vez do nome da impressora."""
    config_key = LAYOUT_TO_CONFIG.get(layout_tipo)
    if config_key and config_key in PRINTER_CONFIGS:
        return PRINTER_CONFIGS[config_key]
    # Fallback: tenta pelo nome da impressora
    if fallback_impressora:
        return get_printer_dims(fallback_impressora)
    return PRINTER_CONFIGS['PEQUEN']


# ============================================
# Utilitários de Impressora
# ============================================
def get_available_printers() -> List[str]:
    if not PYWIN32_OK:
        return ["SIMULADOR_AMP_PEQUENO", "SIMULADOR_AMP_GRANDE"]
    try:
        flags = win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        printers = win32print.EnumPrinters(flags)
        return [p[2] for p in printers]
    except Exception as e:
        logger.error(f"Erro ao listar impressoras: {e}")
        return []

def find_printer_match(requested: str) -> Optional[str]:
    """Match inteligente de impressora (case-insensitive, espaços)."""
    available = get_available_printers()
    requested_clean = re.sub(r'\s+', '', requested).lower()

    if requested in available:
        return requested
    for p in available:
        if re.sub(r'\s+', '', p).lower() == requested_clean:
            return p
    for p in available:
        if requested_clean in re.sub(r'\s+', '', p).lower():
            return p
    return None


# ============================================
# PPLA MODO MILÍMETROS - Conforme documentação oficial
# ============================================
def ppla_text_mm(rot, font, wmult, hmult, y_01mm, x_01mm, data):
    """Gera uma linha de texto PPLA em modo milímetros.
    Coordenadas em 0.1mm (4 dígitos). Ex: 0220 = 22.0mm do bottom.
    SEM '1' literal no prefixo - o primeiro dígito JÁ é a rotação."""
    return f"{rot}{font}{wmult}{hmult}{y_01mm:04d}{x_01mm:04d}{data}"


def ppla_setup_mm(altura_mm=25, margem_c=0, offset_r=0, contraste=12, velocidade='C'):
    """Gera bloco de setup PPLA em modo milímetros.
    
    Conforme documentação Argox PPLA:
    - m: ativa unidade milímetros (0.1mm)
    - Mxxxx: comprimento máximo da etiqueta (em 0.1mm)
    - Cxxxx: margem esquerda (em 0.1mm)  
    - Rxxxx: compensação vertical (em 0.1mm)
    - Hxx: contraste (10=padrão, 16=máx recomendado, 20=máx)
    - PC/PB/PD: velocidade
    - D11: pixel size
    - Q0001: 1 cópia por bloco
    """
    # Comprimento máximo: altura em 0.1mm + margem de tolerância
    m_value = (altura_mm * 10) + 20  # +2mm margem para gap
    
    partes = [
        f"\x02e",           # Gap sensor ON
        f"\x02L",           # Entrar modo formatação
        "m",                # Unidade milímetros
        f"M{m_value:04d}",  # Comprimento máximo
        f"P{velocidade}",   # Velocidade
        f"H{contraste:02d}",# Contraste
        "D14",              # Pixel size
        f"C{margem_c:04d}", # Margem esquerda
        f"R{offset_r:04d}", # Compensação vertical
        "Q0001",            # 1 cópia
    ]
    return "\r".join(partes) + "\r"


def ppla_label_mm(linhas_texto):
    """Monta bloco de conteúdo PPLA (sem setup, apenas linhas de texto + E).
    Cada linha já deve ser formatada com ppla_text_mm().
    Termina com 'E' para finalizar e imprimir."""
    partes = list(linhas_texto)
    partes.append("E")
    return "\r".join(partes) + "\r"


def ppla_full_label(linhas_texto, altura_mm=25, margem_c=0, offset_r=0, contraste=12, velocidade='C'):
    """Monta etiqueta PPLA completa: setup + conteúdo + E."""
    setup = ppla_setup_mm(altura_mm, margem_c, offset_r, contraste, velocidade)
    content = "\r".join(linhas_texto)
    return setup + content + "\r" + "E\r"


# ============================================
# PPLA MODO DOTS - Compatível com Fórmula Certa
# Sem comando 'm', coordenadas em dots (203 DPI = 8 dots/mm)
# ============================================
def _format_y_dots(y):
    """Formata coordenada Y em dots no padrão FC (7 dígitos).
    Positivo: '0000089'. Padrão PPLA: 1111{Y7}{X4}texto."""
    if y >= 0:
        return f"{y:07d}"
    # FC formata negativo como '000000-9'
    neg_str = f"-{abs(y)}"
    return neg_str.rjust(7, '0')


def ppla_text_dots(rot, font, wmult, hmult, y_dots, x_dots, data):
    """Gera uma linha de texto PPLA em modo dots (formato FC).
    Formato: R(1)F(1)H(1)V(1)Y(7 dígitos)X(4 dígitos)DATA
    SEM '1' literal no prefixo - o primeiro dígito JÁ é a rotação."""
    return f"{rot}{font}{wmult}{hmult}{_format_y_dots(y_dots)}{x_dots:04d}{data}"


def ppla_setup_dots(largura_dots=360, altura_dots=200, gap_dots=24, contraste=14, velocidade='C', form_length=289):
    """Gera bloco de setup PPLA MÍNIMO compatível com Fórmula Certa.
    
    Formato FC exato: f289 / L / e / PA / D11 / H14
    Sem STX, sem m, sem M, sem C, sem R - apenas o essencial do FC.
    """
    partes = [
        f"\x02f{form_length}",             # Form length com STX
        "\x02L",                           # Entrar modo formatação com STX
        "\x02e",                           # Gap sensor com STX
        "PA",                              # Position Absolute
        "D14",                             # Pixel size
        f"H{contraste:02d}",               # Contraste
    ]
    return "\r".join(partes) + "\r"


def ppla_full_label_dots(linhas_texto, largura_dots=360, altura_dots=200, gap_dots=24, contraste=14, velocidade='C', form_length=289):
    """Monta etiqueta PPLA completa em modo DOTS (formato FC): setup + conteúdo + Q0001E."""
    setup = ppla_setup_dots(largura_dots, altura_dots, gap_dots, contraste, velocidade, form_length)
    content = "\r".join(linhas_texto)
    return setup + content + "\r" + "Q0001E\r"


def mm_to_dots(value_01mm):
    """Converte coordenada de 0.1mm para dots (203 DPI).
    203 DPI = 8 dots/mm, então 0.1mm = 0.8 dots."""
    return int(value_01mm * 0.8)


# ============================================
# COMPATIBILIDADE: Manter funções PPLB antigas para fallback
# ============================================


# ============================================
# HELPERS de dados
# ============================================
def _crm_completo(rotulo):
    """Formato FC: CONSELHO-UF-NUMERO (ex: COREN-SP-826211, CRM-MG-12345)."""
    prefixo = rotulo.get('prefixoCRM', '')
    numero = rotulo.get('numeroCRM', '')
    uf = rotulo.get('ufCRM', '')
    parts = [p for p in [prefixo, uf, numero] if p]
    return '-'.join(parts) if parts else ''

def _composicao(rotulo, max_len=50):
    comp = rotulo.get('composicao', '') or rotulo.get('formula', '')
    return (comp or '')[:max_len].upper()

def _linha_meta(rotulo):
    parts = []
    ph = rotulo.get('ph', '')
    lote = rotulo.get('lote', '')
    fab = rotulo.get('dataFabricacao', '')
    val = rotulo.get('dataValidade', '')
    if ph: parts.append(f"pH:{ph}")
    if lote: parts.append(f"LT:{lote}")
    if fab: parts.append(f"F:{fab}")
    if val: parts.append(f"V:{val}")
    return " ".join(parts)


# ============================================
# HELPER: Gerar texto e label no modo correto (mm ou dots)
# ============================================
def _ppla_text(rot, font, wmult, hmult, y_01mm, x_01mm, data, modo='mm'):
    """Gera linha de texto PPLA no modo correto.
    Em modo 'mm': coordenadas em 0.1mm.
    Em modo 'dots': converte 0.1mm para dots automaticamente."""
    if modo == 'dots':
        return ppla_text_dots(rot, font, wmult, hmult, mm_to_dots(y_01mm), mm_to_dots(x_01mm), data)
    return ppla_text_mm(rot, font, wmult, hmult, y_01mm, x_01mm, data)


def _build_label(linhas, dims, cal, modo='mm'):
    """Monta etiqueta completa no modo correto (mm ou dots)."""
    contraste = cal.get('contraste', 14)
    if modo == 'dots':
        return ppla_full_label_dots(
            linhas,
            largura_dots=dims.get('largura_dots', 360),
            altura_dots=dims.get('altura_dots', 200),
            gap_dots=dims.get('gap_dots', 24),
            contraste=contraste,
        )
    return ppla_full_label(
        linhas,
        altura_mm=dims.get('altura_mm', 25),
        margem_c=cal.get('margem_c', 0),
        offset_r=cal.get('offset_r', 0),
        contraste=contraste,
    )


# ============================================
# GERADORES PPLA POR LAYOUT (suportam mm e dots)
# ============================================

def _gerar_from_texto_livre(texto_livre, y_positions, x_start, rot, font, cols, dims, cal, modo, line_spacing_factor=1.0):
    """Helper: converte textoLivre (linhas editadas na UI) em comandos PPLA.
    line_spacing_factor: multiplica o espaçamento entre linhas (1.0=padrão, 1.2=mais aberto)."""
    linhas_texto = texto_livre.split('\n')
    pplb_lines = []

    # Recalcular posições Y com fator de espaçamento
    y_positions_calc = list(y_positions)
    if line_spacing_factor != 1.0 and len(y_positions_calc) >= 2:
        base_y = y_positions_calc[0]
        step = y_positions_calc[1] - y_positions_calc[0]  # normalmente negativo (descendo)
        for i in range(1, len(y_positions_calc)):
            y_positions_calc[i] = base_y + int(step * line_spacing_factor * i)

    if len(linhas_texto) > len(y_positions_calc) and len(y_positions_calc) >= 2:
        step = y_positions_calc[-1] - y_positions_calc[-2]
        while len(y_positions_calc) < len(linhas_texto):
            y_positions_calc.append(y_positions_calc[-1] + step)

    for i, line_text in enumerate(linhas_texto):
        y = y_positions_calc[i]
        if line_text.strip():
            pplb_lines.append(_ppla_text(rot, font, 1, 1, y, x_start, line_text[:cols], modo))
    if not pplb_lines:
        pplb_lines.append(_ppla_text(rot, font, 1, 1, y_positions_calc[0], x_start, 'SEM DADOS', modo))
    return _build_label(pplb_lines, dims, cal, modo)


def _build_label_ampcx(linhas, dims, cal):
    """Build AMP_CX label — 109x25mm. Usa mesmos parâmetros do FC (f289, D11)."""
    contraste = cal.get('contraste', 14)
    setup_parts = [
        "\x02f289",    # form length FC exato (igual A_PAC_PEQ)
        "\x02L",
        "\x02e",
        "PA",
        "D11",         # pixel size FC exato
        f"H{contraste:02d}",
    ]
    setup = "\r".join(setup_parts) + "\r"
    content = "\r".join(linhas)
    return setup + content + "\r" + "Q0001E\r"


def gerar_ppla_ampcx(rotulo, farmacia, dims=None, calibracao=None):
    """Layout AMP_CX (109x25mm) - Coordenadas FC exatas.
    
    Font=9, Rotation=1 (FIXOS - paridade FC)
    Setup: f250, PB, D11, H14
    Y levels: 10082, 10073, 10064, 10055, 10046, 10037, 10028
    X positions: 24(left), 142(REQ), 171(APLICACAO), 176(REG)
    """
    if not dims:
        dims = PRINTER_CONFIGS.get('AMP_CX', PRINTER_CONFIGS['GRAND'])
    cal = calibracao or {}
    modo = 'dots'
    cols = dims['cols_max']
    font = 1
    rot = 1

    # Coordenadas Y em dots (203 DPI) para etiqueta 109x25mm
    y_dots = [82, 73, 64, 55, 46, 37, 28]
    # Coordenadas X em dots
    x_dots_map = {'left': 21, 'req': 120, 'aplicacao': 150, 'reg': 155}

    # Se textoLivre foi editado na UI, usar diretamente (WYSIWYG)
    texto_livre = rotulo.get('textoLivre', '')
    if texto_livre:
        lsf = float(rotulo.get('lineSpacingFactor', 1.0) or 1.0)
        linhas_texto = texto_livre.split('\n')
        pplb_lines = []
        y_dots_calc = list(y_dots)
        # Aplicar fator de espaçamento
        if lsf != 1.0 and len(y_dots_calc) >= 2:
            base_y = y_dots_calc[0]
            step = y_dots_calc[1] - y_dots_calc[0]
            for i in range(1, len(y_dots_calc)):
                y_dots_calc[i] = base_y + int(step * lsf * i)
        if len(linhas_texto) > len(y_dots_calc) and len(y_dots_calc) >= 2:
            step = y_dots_calc[-1] - y_dots_calc[-2]
            while len(y_dots_calc) < len(linhas_texto):
                y_dots_calc.append(y_dots_calc[-1] + step)
        for i, line_text in enumerate(linhas_texto):
            y = y_dots_calc[i]
            if line_text.strip():
                pplb_lines.append(ppla_text_dots(rot, font, 1, 1, y, x_dots_map['left'], line_text[:cols]))
        if not pplb_lines:
            pplb_lines.append(ppla_text_dots(rot, font, 1, 1, y_dots_calc[0], x_dots_map['left'], 'SEM DADOS'))
        return _build_label_ampcx(pplb_lines, dims, cal)

    # === Geração estruturada (paridade FC) ===
    paciente = (rotulo.get('nomePaciente', '') or '').upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    composicao_full = (rotulo.get('composicao', '') or rotulo.get('formula', '') or '').upper()
    uso = (rotulo.get('tipoUso', '') or rotulo.get('posologia', '') or '').upper()
    aplicacao = (rotulo.get('aplicacao', '') or '').upper()
    contem = (rotulo.get('contem', '') or '').upper()
    registro = str(rotulo.get('numeroRegistro', '') or '')
    componentes = rotulo.get('componentes', []) or []

    def _fmt_date_short(d):
        """dd/mm/yyyy ou yyyy-mm-dd → mm/yy"""
        d = (d or '').strip()
        if not d:
            return ''
        if '/' in d and len(d) >= 10:
            parts = d.split('/')
            return f"{parts[1]}/{parts[2][-2:]}"
        if '-' in d and len(d) >= 10:
            parts = d.split('-')
            return f"{parts[1]}/{parts[0][-2:]}"
        return d[:5]

    linhas = []

    # Y[0]=82: Paciente + REQ
    linhas.append(ppla_text_dots(rot, font, 1, 1, y_dots[0], x_dots_map['left'], paciente[:55]))
    linhas.append(ppla_text_dots(rot, font, 1, 1, y_dots[0], x_dots_map['req'], f"REQ:{nr_req}-{nr_item}"))

    # Y[1]=73: DR(A) + CRM
    linhas.append(ppla_text_dots(rot, font, 1, 1, y_dots[1], x_dots_map['left'], f"DR(A){nome_medico[:30]} {crm}"))

    # Y[2..] = Componentes ou composição com pH/L/F/V na mesma linha
    if componentes:
        for ci, comp in enumerate(componentes):
            if ci >= 3:
                break
            nome_c = (comp.get('nome', '') or '').upper()
            ph_c = (comp.get('ph', '') or '').strip()
            lote_c = (comp.get('lote', '') or '').strip()
            fab_c = _fmt_date_short(comp.get('fabricacao', ''))
            val_c = _fmt_date_short(comp.get('validade', ''))
            meta = f"PH:{ph_c} L:{lote_c} F:{fab_c} V:{val_c}"
            max_nome = cols - len(meta) - 1
            line_text = f"{nome_c[:max_nome]} {meta}"
            linhas.append(ppla_text_dots(rot, font, 1, 1, y_dots[2 + ci], x_dots_map['left'], line_text[:cols]))
        next_y_idx = 2 + min(len(componentes), 3)
    else:
        # Produto único: composição + pH/L/F/V na mesma linha
        ph_val = (rotulo.get('ph', '') or '').strip()
        lote_val = (rotulo.get('lote', '') or '').strip()
        fab_val = _fmt_date_short(rotulo.get('dataFabricacao', ''))
        val_val = _fmt_date_short(rotulo.get('dataValidade', ''))
        meta = f"PH:{ph_val} L:{lote_val} F:{fab_val} V:{val_val}"
        max_comp = cols - len(meta) - 1
        line_text = f"{composicao_full[:max_comp]} {meta}"
        linhas.append(ppla_text_dots(rot, font, 1, 1, y_dots[2], x_dots_map['left'], line_text[:cols]))
        next_y_idx = 3

    # Uso + Aplicação
    uso_y = y_dots[min(next_y_idx, len(y_dots) - 2)]
    if uso:
        linhas.append(ppla_text_dots(rot, font, 1, 1, uso_y, x_dots_map['left'], uso[:30]))
    if aplicacao:
        linhas.append(ppla_text_dots(rot, font, 1, 1, uso_y, x_dots_map['aplicacao'], f"APLICACAO:{aplicacao}"))

    # Contem + REG
    contem_y = y_dots[min(next_y_idx + 1, len(y_dots) - 1)]
    contem_text = f"CONTEM: {contem}" if contem else "CONTEM: "
    linhas.append(ppla_text_dots(rot, font, 1, 1, contem_y, x_dots_map['left'], contem_text[:40]))
    if registro:
        linhas.append(ppla_text_dots(rot, font, 1, 1, contem_y, x_dots_map['reg'], f"REG:{registro}"))

    if not linhas:
        linhas.append(ppla_text_dots(rot, font, 1, 1, y_dots[0], x_dots_map['left'], 'SEM DADOS'))

    return _build_label_ampcx(linhas, dims, cal)


def _build_label_ppla(linhas, cal, velocidade='PA'):
    """Função base PPLA: setup para etiquetas 25mm — formato FC exato."""
    contraste = cal.get('contraste', 14)
    setup_parts = [
        "\x02f289",    # form length FC exato (f289 para etiquetas 25mm altura)
        "\x02L",
        "\x02e",
        velocidade,
        "D11",         # pixel size FC exato (D11, não D14)
        f"H{contraste:02d}",
    ]
    setup = "\r".join(setup_parts) + "\r"
    content = "\r".join(linhas)
    return setup + content + "\r" + "Q0001E\r"


def _build_label_amp10(linhas, dims, cal):
    """Build AMP10 label — 89x38mm. D11 para paridade FC."""
    contraste = cal.get('contraste', 14)
    setup_parts = [
        "\x02f304",    # form length para 38mm (304 dots a 203 DPI)
        "\x02L",
        "\x02e",
        "PA",
        "D11",         # pixel size FC exato
        f"H{contraste:02d}",
    ]
    setup = "\r".join(setup_parts) + "\r"
    content = "\r".join(linhas)
    return setup + content + "\r" + "Q0001E\r"


def _clean_patient_name(name):
    """Remove IDs/telefones iniciais do nome do paciente (ex: '12345 JOAO SILVA' → 'JOAO SILVA')."""
    name = (name or '').strip().upper()
    # Remove leading numeric IDs
    name = re.sub(r'^\d+\s*', '', name)
    return name


def _format_conselho_dots(rotulo):
    """Formato FC com pontos: CONSELHO.UF-NUMERO (ex: COREN.SP-1038417)."""
    prefixo = rotulo.get('prefixoCRM', '')
    numero = rotulo.get('numeroCRM', '')
    uf = rotulo.get('ufCRM', '')
    if prefixo and uf and numero:
        return f"{prefixo}.{uf}-{numero}"
    parts = [p for p in [prefixo, uf, numero] if p]
    return '-'.join(parts) if parts else ''


def _compact_line(*segments):
    """Junta segmentos com espaço simples, removendo vazios."""
    return ' '.join(s for s in segments if s)


def gerar_ppla_amp10(rotulo, farmacia, dims=None, calibracao=None):
    """Layout AMP10 — formato FC EXATO capturado do FormulaCerta.

    Setup: f250, PB, D14, H14  (FC original usa f250 + PB)
    Font=9, Rotation=1

    Coordenadas Y (passo -9):
      Y=10110 X=14:  Paciente     | X=196: REQ
      Y=10101 X=14:  DR(A)Medico  | X=196: CRM
      Y=10092 X=14:  Composição
      Y=10083 X=14:  pH  | X=53: Lote | X=102: Fab | X=147: Val
      Y=10074 X=14:  Uso           | X=147: Aplicação
      Y=10065 X=14:  Contem        | X=151: REG
    """
    if not dims:
        dims = PRINTER_CONFIGS['AMP10']
    cal = calibracao or {}
    cols = dims['cols_max']
    font = 1   # font padrão (compatível com demais layouts)
    rot = 1

    # Y levels em dots (203 DPI) para etiqueta 89x38mm = 304 dots altura
    # 6 linhas distribuídas de Y=280 até Y=80, passo -40 (≈5mm entre linhas)
    y_levels = [280, 240, 200, 160, 120, 80, 60, 40, 20]
    # X positions em dots para etiqueta 89mm = 712 dots largura
    x_left  = 14   # ≈1.7mm da borda esquerda
    x_req   = 550  # ≈68mm da esquerda (campo REQ no lado direito)
    x_lote  = 80
    x_fab   = 210
    x_val   = 350
    x_reg   = 520

    # textoLivre: cada linha do editor mapeia para um Y level
    texto_livre = rotulo.get('textoLivre', '')
    if texto_livre:
        lsf = float(rotulo.get('lineSpacingFactor', 1.0) or 1.0)
        return _gerar_from_texto_livre(texto_livre, y_levels, x_left, rot, font, cols, dims, cal, 'dots', lsf)

    # === Geração estruturada (paridade FC) ===
    paciente   = _clean_patient_name(rotulo.get('nomePaciente', ''))
    nr_req     = rotulo.get('nrRequisicao', '')
    nr_item    = rotulo.get('nrItem', '0')
    nome_med   = (rotulo.get('nomeMedico', '') or '').upper()
    conselho   = _crm_completo(rotulo)
    comp_full  = (rotulo.get('composicao', '') or rotulo.get('formula', '') or '').upper()
    ph         = (rotulo.get('ph', '') or '').strip()
    lote       = rotulo.get('lote', '')
    fab        = rotulo.get('dataFabricacao', '')
    val        = rotulo.get('dataValidade', '')
    uso        = (rotulo.get('tipoUso', '') or rotulo.get('posologia', '') or '').upper()
    aplicacao  = (rotulo.get('aplicacao', '') or '').upper()
    contem     = (rotulo.get('contem', '') or '').upper()
    registro   = str(rotulo.get('numeroRegistro', '') or '')
    componentes = rotulo.get('componentes', []) or []

    linhas = []

    # Y=10110: Paciente (X=14) + REQ (X=196)
    linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[0], x_left, paciente[:cols]))
    linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[0], x_req,  f"REQ:{nr_req}-{nr_item}"))

    # Y=10101: DR(A)Medico (X=14) + CRM (X=196)
    linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[1], x_left, f"DR(A){nome_med}"[:cols]))
    if conselho:
        linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[1], x_req, conselho))

    if componentes:
        # KIT: componentes a partir de Y=10092
        for i, comp in enumerate(componentes[:6]):
            yi = y_levels[2 + i] if (2 + i) < len(y_levels) else y_levels[-1]
            nome = (comp.get('nome', '') or '').upper()
            parts = [nome]
            if comp.get('ph'):   parts.append(f"pH:{comp['ph']}")
            if comp.get('lote'): parts.append(f"L:{comp['lote']}")
            if comp.get('fabricacao'): parts.append(f"F:{comp['fabricacao']}")
            if comp.get('validade'):   parts.append(f"V:{comp['validade']}")
            linhas.append(ppla_text_dots(rot, font, 1, 1, yi, x_left, ' '.join(parts)[:cols]))
    else:
        # Y=10092: Composição (X=14)
        if comp_full:
            linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[2], x_left, comp_full[:cols]))

        # Y=10083: pH (X=14) | Lote (X=53) | Fab (X=102) | Val (X=147)
        if ph:   linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[3], x_left, f"pH:{ph}"))
        if lote: linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[3], x_lote, f"L:{lote}"))
        if fab:  linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[3], x_fab,  f"F:{fab}"))
        if val:  linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[3], x_val,  f"V:{val}"))

    # Y=10074: Uso (X=14) | Aplicação (X=147)
    if uso:      linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[4], x_left, uso[:cols]))
    if aplicacao: linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[4], x_val, f"APLICACAO:{aplicacao}"))

    # Y=10065: Contem (X=14) | REG (X=151)
    if contem:   linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[5], x_left, f"CONTEM:{contem}"))
    if registro: linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[5], x_reg,  f"REG:{registro}"))

    if not linhas:
        linhas.append(ppla_text_dots(rot, font, 1, 1, y_levels[0], x_left, 'SEM DADOS'))

    return _build_label_amp10(linhas, dims, cal)


def gerar_ppla_a_pac_peq(rotulo, farmacia, dims=None, calibracao=None):
    """Layout A.PAC.PEQ (45x25mm) - Coordenadas FC captura real.

    Y=89 X=12   Paciente            | Y=89 X=116  REQ:XXXXXX-N
    Y=78 X=12   DR(A)Nome CRF-UF-N
    Y=67 X=129  REG:XXXXX
    """
    if not dims:
        dims = PRINTER_CONFIGS['PEQUEN']
    cal = calibracao or {}
    cols = dims['cols_max']
    font = 1   # FC: 1111 = rot=1, font=1, wmult=1, hmult=1
    wmult = 1
    hmult = 1
    rot = 1

    # Coordenadas FC exatas capturadas do PPLA real:
    x_paciente = 12   # X=12 paciente
    x_req = 116       # X=116 REQ (lado direito no PEQ)
    x_reg = 129       # X=129 REG

    # y_positions: valores exatos do FC (89=topo, decremento de 11 por linha)
    y_positions = [89, 78, 67, 56, 45, 34, 23, 12]

    texto_livre = rotulo.get('textoLivre', '')
    if texto_livre:
        lsf = float(rotulo.get('lineSpacingFactor', 1.0) or 1.0)
        linhas_texto = texto_livre.split('\n')
        pplb_lines = []
        y_positions_calc = list(y_positions)
        if lsf != 1.0 and len(y_positions_calc) >= 2:
            base_y = y_positions_calc[0]
            step = y_positions_calc[1] - y_positions_calc[0]
            for i in range(1, len(y_positions_calc)):
                y_positions_calc[i] = base_y + int(step * lsf * i)

        for pos_idx, line_text in enumerate(linhas_texto):
            stripped = line_text.strip()
            if not stripped:
                continue
            y = y_positions_calc[pos_idx] if pos_idx < len(y_positions_calc) else y_positions_calc[-1]
            # Linha com REQ: paciente à esquerda + REQ à direita (mesmo Y, como FC)
            if 'REQ:' in stripped:
                req_match = re.search(r'(REQ:\S+)', stripped)
                if req_match:
                    patient_part = stripped[:req_match.start()].strip()
                    if patient_part:
                        pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_paciente, patient_part[:cols]))
                    pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_req, req_match.group(1)[:cols]))
                else:
                    pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_paciente, stripped[:cols]))
            elif 'REG:' in stripped:
                reg_match = re.search(r'(REG:\S+)', stripped)
                if reg_match:
                    pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_reg, reg_match.group(1)[:cols]))
                else:
                    pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_paciente, stripped[:cols]))
            else:
                pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_paciente, stripped[:cols]))
        if not pplb_lines:
            pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y_positions[0], x_paciente, 'SEM DADOS'))
        return _build_label_ppla(pplb_lines, cal)

    # Modo estruturado: coordenadas FC exatas
    paciente = (rotulo.get('nomePaciente', '') or '')[:25].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()[:20]
    crm = _crm_completo(rotulo)[:15]
    registro = str(rotulo.get('numeroRegistro', '') or '')[:8]

    linhas = []
    # Y=89: Paciente (X=12) + REQ (X=116)
    if paciente:
        linhas.append(ppla_text_dots(rot, font, wmult, hmult, 89, x_paciente, paciente))
    req_str = f"REQ:{nr_req}-{nr_item}"
    linhas.append(ppla_text_dots(rot, font, wmult, hmult, 89, x_req, req_str))

    # Y=78: DR(A)Médico + CRM
    if nome_medico:
        medico_str = f"DR(A){nome_medico}"
        if crm:
            medico_str = f"{medico_str} {crm}"
        linhas.append(ppla_text_dots(rot, font, wmult, hmult, 78, x_paciente, medico_str[:cols]))

    # Y=67: REG (X=129)
    if registro:
        linhas.append(ppla_text_dots(rot, font, wmult, hmult, 67, x_reg, f"REG:{registro}"))

    if not linhas:
        linhas.append(ppla_text_dots(rot, font, wmult, hmult, 89, x_paciente, 'SEM DADOS'))

    return _build_label_ppla(linhas, cal)

def gerar_ppla_a_pac_gran(rotulo, farmacia, dims=None, calibracao=None):
    """Layout A.PAC.GRAN (76x25mm) — formato FC EXATO capturado do FormulaCerta.

    Setup FC exato: f289, PA, D11, H14, prefixo 1111
    Capturado do PPLA real:
      Y=89 X=12:  Paciente  | X=172: REQ
      Y=78 X=12:  DR(A)Med  | X=159: CRM | X=223: REG
    """
    if not dims:
        dims = PRINTER_CONFIGS.get('A_PAC_GRAN', PRINTER_CONFIGS['GRAND'])
    cal = calibracao or {}
    cols = dims['cols_max']
    font = 1
    wmult = 1
    hmult = 1
    rot = 1

    # Coordenadas FC exatas capturadas do PPLA real
    x_pac = 12
    x_req = 172
    x_med = 12
    x_crm = 159
    x_reg = 223
    y_positions = [89, 78, 67, 56, 45, 34, 23, 12]

    texto_livre = rotulo.get('textoLivre', '')
    if texto_livre:
        lsf = float(rotulo.get('lineSpacingFactor', 1.0) or 1.0)
        linhas_texto = texto_livre.split('\n')
        pplb_lines = []
        y_positions_calc = list(y_positions)
        if lsf != 1.0 and len(y_positions_calc) >= 2:
            base_y = y_positions_calc[0]
            step = y_positions_calc[1] - y_positions_calc[0]
            for i in range(1, len(y_positions_calc)):
                y_positions_calc[i] = base_y + int(step * lsf * i)

        visible_idx = 0
        for line_text in linhas_texto:
            stripped = line_text.strip()
            if not stripped:
                continue
            y = y_positions_calc[visible_idx] if visible_idx < len(y_positions_calc) else y_positions_calc[-1]
            if 'REQ:' in stripped:
                # L1: Paciente + REQ
                req_match = re.search(r'(REQ:\S+)', stripped)
                if req_match:
                    patient_part = stripped[:req_match.start()].strip()
                    if patient_part:
                        pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_pac, patient_part[:cols]))
                    pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_req, req_match.group(1)[:cols]))
                else:
                    pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_pac, stripped[:cols]))
            elif 'DR(A)' in stripped or 'REG:' in stripped:
                # L2: DR(A)+Medico + Conselho + REG na mesma linha
                # Extrair REG se presente
                reg_match = re.search(r'(REG:\S+)', stripped)
                reg_part = reg_match.group(1) if reg_match else None
                remainder = stripped[:reg_match.start()].rstrip() if reg_match else stripped

                # Detectar conselho (CRM-XX-NNN, COREN-XX-NNN, etc.)
                crm_match = re.search(r'((?:CRM|CRBM|COREN|CRO|CRF|CRMV|CRN|CREFITO|CREF|CRP|CRFA)-\S+)', remainder)
                crm_part = crm_match.group(1) if crm_match else None
                dr_part = remainder[:crm_match.start()].rstrip() if crm_match else remainder.strip()

                if dr_part:
                    pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_med, dr_part[:cols]))
                if crm_part:
                    pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_crm, crm_part[:cols]))
                if reg_part:
                    pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_reg, reg_part[:cols]))
            else:
                pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y, x_pac, stripped[:cols]))
        if not pplb_lines:
            pplb_lines.append(ppla_text_dots(rot, font, wmult, hmult, y_positions[0], x_pac, 'SEM DADOS'))
        return _build_label_ppla(pplb_lines, cal)

    # === Geração estruturada — paridade FC exata ===
    paciente  = _clean_patient_name(rotulo.get('nomePaciente', ''))
    nr_req    = rotulo.get('nrRequisicao', '')
    nr_item   = rotulo.get('nrItem', '1')
    nom_med   = (rotulo.get('nomeMedico', '') or '').upper()
    crm       = _crm_completo(rotulo)
    registro  = str(rotulo.get('numeroRegistro', '') or '')

    linhas = []

    # Y=89: Paciente (X=12) + REQ (X=172)
    linhas.append(ppla_text_dots(rot, font, wmult, hmult, 89, x_pac, paciente[:cols]))
    linhas.append(ppla_text_dots(rot, font, wmult, hmult, 89, x_req, f"REQ:{nr_req}-{nr_item}"))

    # Y=78: DR(A)Medico (X=12) + CRM (X=159) + REG (X=223)
    linhas.append(ppla_text_dots(rot, font, wmult, hmult, 78, x_med, f"DR(A){nom_med}"[:cols]))
    if crm:
        linhas.append(ppla_text_dots(rot, font, wmult, hmult, 78, x_crm, crm))
    if registro:
        linhas.append(ppla_text_dots(rot, font, wmult, hmult, 78, x_reg, f"REG:{registro}"))

    if not linhas:
        linhas.append(ppla_text_dots(rot, font, wmult, hmult, 89, x_pac, 'SEM DADOS'))

    return _build_label_ppla(linhas, cal)

def gerar_ppla_tirz(rotulo, farmacia, dims=None, calibracao=None):
    """Layout TIRZ/Tirzepatida (109x25mm) - 8 linhas."""
    if not dims:
        dims = PRINTER_CONFIGS['GRAND']
    cal = calibracao or {}
    modo = cal.get('modo', 'dots')
    cols = dims['cols_max']
    font = cal.get('fonte', dims.get('font', 2))
    rot = cal.get('rotacao', 0)
    
    # Se textoLivre foi editado na UI, usar diretamente
    texto_livre = rotulo.get('textoLivre', '')
    if texto_livre:
        y_pos = [220, 190, 160, 130, 100, 70, 40, 20]
        lsf = float(rotulo.get('lineSpacingFactor', 1.0) or 1.0)
        return _gerar_from_texto_livre(texto_livre, y_pos, 10, rot, font, cols, dims, cal, modo, lsf)
    
    paciente = (rotulo.get('nomePaciente', '') or '')[:cols].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    composicao = _composicao(rotulo, cols)
    posologia = (rotulo.get('posologia', '') or '')[:cols].upper()
    linha_meta = _linha_meta(rotulo)
    aplicacao = (rotulo.get('aplicacao', '') or '')[:30].upper()
    contem = (rotulo.get('contem', '') or '')[:30].upper()
    registro = str(rotulo.get('numeroRegistro', '') or '')
    
    y_pos = [220, 190, 160, 130, 100, 70, 40, 20]
    x_start = 10
    
    linhas = [
        _ppla_text(rot, font, 1, 1, y_pos[0], x_start, paciente, modo),
        _ppla_text(rot, font, 1, 1, y_pos[0], 300, f"REQ:{nr_req}-{nr_item}", modo),
        _ppla_text(rot, font, 1, 1, y_pos[1], x_start, f"DR. {nome_medico[:25]} CRM {crm}", modo),
        _ppla_text(rot, font, 1, 1, y_pos[2], x_start, composicao, modo),
        _ppla_text(rot, font, 1, 1, y_pos[3], x_start, posologia, modo),
        _ppla_text(rot, font, 1, 1, y_pos[4], x_start, linha_meta, modo),
        _ppla_text(rot, font, 1, 1, y_pos[5], x_start, f"APLICACAO: {aplicacao}", modo),
        _ppla_text(rot, font, 1, 1, y_pos[6], x_start, f"CONTEM: {contem}  REG:{registro}", modo),
    ]
    
    return _build_label(linhas, dims, cal, modo)


# Mapa de geradores
GERADORES_PPLA = {
    'AMP_CX': gerar_ppla_ampcx,
    'AMP10': gerar_ppla_amp10,
    'A_PAC_PEQ': gerar_ppla_a_pac_peq,
    'A_PAC_GRAN': gerar_ppla_a_pac_gran,
    'TIRZ': gerar_ppla_tirz,
}



# ============================================
# ENVIO PARA IMPRESSORA
# ============================================
def _printer_key(nome_impressora: str) -> str:
    return re.sub(r'\s+', '', (nome_impressora or '').upper())


PRINTER_DATATYPE_CACHE: Dict[str, str] = {}


def _detectar_raw_type(nome_impressora):
    """Detecta se o driver requer XPS_PASS (v4) ou RAW (v3)."""
    if not PYWIN32_OK:
        return "RAW"
    try:
        drivers = win32print.EnumPrinterDrivers(None, None, 2)
        for drv in drivers:
            if drv.get('Name', '').upper() in nome_impressora.upper() or \
               nome_impressora.upper() in drv.get('Name', '').upper():
                version = drv.get('Version', 3)
                logger.info(f"Driver '{drv.get('Name')}' versão {version} detectado")
                return "XPS_PASS" if version == 4 else "RAW"
    except Exception as e:
        logger.error(f"Erro ao detectar versão do driver: {e}")
    return "RAW"


def _candidatos_datatype(nome_impressora: str) -> List[str]:
    """Ordem de tentativa priorizando estabilidade (RAW primeiro, com cache de sucesso)."""
    key = _printer_key(nome_impressora)
    cached = PRINTER_DATATYPE_CACHE.get(key)
    detected = _detectar_raw_type(nome_impressora)

    ordem: List[str] = []
    if cached in ("RAW", "XPS_PASS"):
        ordem.append(cached)

    # Para Argox, RAW é mais estável no boot; tentamos sempre cedo.
    if "RAW" not in ordem:
        ordem.append("RAW")

    if detected in ("RAW", "XPS_PASS") and detected not in ordem:
        ordem.append(detected)

    if "XPS_PASS" not in ordem:
        ordem.append("XPS_PASS")

    return ordem




def _enviar_com_datatype(nome_impressora: str, dados: bytes, datatype: str) -> None:
    hPrinter = win32print.OpenPrinter(nome_impressora)
    try:
        win32print.StartDocPrinter(hPrinter, 1, ("Etiqueta PPLA", None, datatype))
        try:
            win32print.StartPagePrinter(hPrinter)
            win32print.WritePrinter(hPrinter, dados)
            win32print.EndPagePrinter(hPrinter)
        finally:
            win32print.EndDocPrinter(hPrinter)
    finally:
        win32print.ClosePrinter(hPrinter)


def enviar_para_impressora(nome_impressora, comandos, aplicar_startup_guard=True):
    """Envia comandos para a impressora com estratégia robusta de datatype."""
    if not PYWIN32_OK:
        preview = comandos[:500] if isinstance(comandos, str) else str(comandos[:120])
        logger.info(f"[SIMULAÇÃO] Enviando para {nome_impressora}:\n{preview}")
        return {"success": True, "message": "Simulação OK"}

    key = _printer_key(nome_impressora)

    # String -> cp1252 (PPLA). Bytes -> passthrough (RAW exato).
    dados = comandos if isinstance(comandos, bytes) else comandos.encode('cp1252', errors='replace')

    candidatos = _candidatos_datatype(nome_impressora)
    logger.info(f"Datatypes candidatos para '{nome_impressora}': {candidatos}")

    erros: List[str] = []
    for datatype in candidatos:
        try:
            _enviar_com_datatype(nome_impressora, dados, datatype)
            PRINTER_DATATYPE_CACHE[key] = datatype
            logger.info(f"[PRINT-OK] datatype='{datatype}' impressora='{nome_impressora}'")
            logger.info(f"Envio concluído com datatype '{datatype}' para '{nome_impressora}'")
            return {"success": True, "datatype": datatype}
        except Exception as e:
            logger.warning(f"Falha com datatype '{datatype}' em '{nome_impressora}': {e}")
            erros.append(f"{datatype}: {e}")

    return {"success": False, "error": " | ".join(erros)}


# ============================================
# ENDPOINTS
# ============================================
@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "online",
        "impressora_padrao": IMPRESSORA_PADRAO,
        "sistema": platform.system(),
        "impressao_disponivel": PYWIN32_OK,
        "hostname": socket.gethostname(),
        "version": "3.0.0",
        "protocolo": "PPLA-mm",
    })


@app.route('/impressoras', methods=['GET'])
def listar_impressoras():
    printers = get_available_printers()
    padrao = ""
    if PYWIN32_OK:
        try:
            padrao = win32print.GetDefaultPrinter()
        except Exception:
            pass
    return jsonify({"impressoras": printers, "padrao": padrao})


@app.route('/teste', methods=['POST'])
def teste_impressao():
    """Imprime etiqueta de teste PPLA em modo milímetros."""
    impressora_req = (request.json or {}).get('impressora', IMPRESSORA_PADRAO)
    impressora = find_printer_match(impressora_req) or impressora_req
    dims = get_printer_dims(impressora)

    comandos = ppla_full_label(
        [
            ppla_text_mm(1, 3, 1, 1, 200, 10, "*** TESTE V3.0 ***"),
            ppla_text_mm(1, 2, 1, 1, 150, 10, "PPLA mm OK"),
            ppla_text_mm(1, 2, 1, 1, 100, 10, f"Imp: {impressora[:30]}"),
            ppla_text_mm(1, 2, 1, 1, 50,  10, f"{dims['largura_mm']}x{dims['altura_mm']}mm"),
        ],
        altura_mm=dims.get('altura_mm', 25),
    )

    resultado = enviar_para_impressora(impressora, comandos)
    if resultado.get("success"):
        return jsonify({"success": True, "message": "Teste V3 enviado com sucesso"})
    else:
        return jsonify({"success": False, "error": resultado.get("error", "Falha")}), 500


@app.route('/teste-dots', methods=['POST'])
def teste_dots():
    """Imprime etiqueta de teste em modo DOTS (sem comando 'm').
    Compatível com Fórmula Certa - se esta etiqueta sair com texto,
    confirma que o problema era o modo milímetros."""
    impressora_req = (request.json or {}).get('impressora', IMPRESSORA_PADRAO)
    impressora = find_printer_match(impressora_req) or impressora_req
    dims = get_printer_dims(impressora)

    logger.info(f"[TESTE-DOTS] Impressora: {impressora} ({dims['largura_mm']}x{dims['altura_mm']}mm)")

    # Usar coordenadas em DOTS diretamente (sem 'm')
    # Para 45x25mm a 203 DPI: largura=360, altura=200
    largura_dots = dims['largura_dots']
    altura_dots = dims['altura_dots']
    gap_dots = dims['gap_dots']

    linhas = [
        ppla_text_dots(1, 2, 1, 1, 160, 8, "*** TESTE DOTS ***"),
        ppla_text_dots(1, 2, 1, 1, 120, 8, "MODO DOTS OK"),
        ppla_text_dots(1, 2, 1, 1, 80, 8, f"Imp: {impressora[:25]}"),
        ppla_text_dots(1, 2, 1, 1, 40, 8, f"{dims['largura_mm']}x{dims['altura_mm']}mm ({largura_dots}x{altura_dots}dots)"),
    ]

    comandos = ppla_full_label_dots(linhas, largura_dots, altura_dots, gap_dots, contraste=14)

    logger.info(f"[TESTE-DOTS] Comandos ({len(comandos)} bytes):")
    for i, line in enumerate(comandos.split('\r')):
        display = line.replace('\x02', '<STX>')
        logger.info(f"  [{i:02d}] {display}")

    resultado = enviar_para_impressora(impressora, comandos)
    if resultado.get("success"):
        return jsonify({"success": True, "message": "Teste DOTS enviado!", "modo": "dots"})
    else:
        return jsonify({"success": False, "error": resultado.get("error", "Falha")}), 500


@app.route('/imprimir', methods=['POST'])
def imprimir():
    """Recebe JSON com rótulos e imprime via PPLA modo milímetros."""
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Nenhum dado recebido"}), 400

    impressora_req = data.get('impressora', '') or IMPRESSORA_PADRAO
    layout_tipo = data.get('layout_tipo', 'AMP_CX')
    farmacia = data.get('farmacia', {})
    rotulos = data.get('rotulos', [])
    
    # Calibração: em produção sempre usamos PPLA em DOTS para manter paridade FC.
    calibracao_in = data.get('calibracao', {}) or {}
    calibracao = {**calibracao_in, 'modo': 'dots'}

    if not rotulos:
        return jsonify({"success": False, "error": "Nenhum rótulo para imprimir"}), 400

    impressora = find_printer_match(impressora_req) or impressora_req
    logger.info(f"Impressora solicitada: '{impressora_req}' -> resolvida: '{impressora}'")
    logger.info(f"Calibração: C={calibracao.get('margem_c', 0)} R={calibracao.get('offset_r', 0)} Font={calibracao.get('fonte', 2)} Rot={calibracao.get('rotacao', 0)} ModoForcado={calibracao.get('modo', 'dots')} ModoRecebido={calibracao_in.get('modo', 'dots')}")
    if calibracao_in.get('modo') not in (None, 'dots'):
        logger.warning(f"[PRINT] Modo recebido '{calibracao_in.get('modo')}' foi forçado para 'dots' para manter paridade FC")

    gerador = GERADORES_PPLA.get(layout_tipo, gerar_ppla_ampcx)
    dims = get_dims_by_layout(layout_tipo, impressora)

    # Gerar todas as etiquetas (cada uma já inclui setup completo em mm)
    comandos_todos = ""
    erros_geracao = []
    for rotulo in rotulos:
        try:
            label = gerador(rotulo, farmacia, dims, calibracao)
            comandos_todos += label
            logger.info(f"Rótulo {rotulo.get('id', '?')} layout={layout_tipo} {dims['largura_mm']}x{dims['altura_mm']}mm adicionado")
        except Exception as e:
            erros_geracao.append(f"Rótulo {rotulo.get('id', '?')}: {str(e)}")

    if not comandos_todos:
        return jsonify({"success": False, "error": "Nenhum comando gerado", "erros": erros_geracao}), 500

    # Debug: mostrar comandos PPLA
    logger.info(f"\n{'='*60}")
    logger.info(f"[DEBUG PPLA-mm] Comandos completos ({len(comandos_todos)} bytes):")
    for i, line in enumerate(comandos_todos.split('\r')):
        display = line.replace('\x02', '<STX>').replace('\n', '<LF>')
        logger.info(f"  [{i:02d}] {display}")
    logger.info(f"{'='*60}")

    # Enviar
    logger.info(f"Enviando batch de {len(rotulos)} rótulos para '{impressora}'")
    resultado = enviar_para_impressora(impressora, comandos_todos)

    if resultado.get("success"):
        return jsonify({
            "success": True,
            "impressos": len(rotulos) - len(erros_geracao),
            "printer_used": impressora,
            "layout_used": layout_tipo,
            "protocolo": "PPLA-mm",
            "erros": erros_geracao if erros_geracao else None
        })
    else:
        return jsonify({
            "success": False,
            "error": resultado.get("error", "Falha"),
            "erros": erros_geracao
        }), 500


@app.route('/imprimir-rotutx', methods=['POST'])
def imprimir_rotutx():
    """Recebe linhas de texto extraídas do ROTUTX (FC12300) e imprime via PPLA (modo dots ou mm)."""
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Nenhum dado recebido"}), 400

    impressora_req = data.get('impressora', '') or IMPRESSORA_PADRAO
    linhas = data.get('linhas', [])
    req_num = data.get('req', '?')
    calibracao = data.get('calibracao', {}) or {}
    # Forçar DOTS no fluxo ROTUTX para reproduzir padrão Fórmula Certa
    modo = 'dots'

    if not linhas:
        return jsonify({"success": False, "error": "Nenhuma linha de texto recebida"}), 400

    impressora = find_printer_match(impressora_req) or impressora_req
    dims = get_printer_dims(impressora)
    logger.info(f"[ROTUTX] REQ={req_num} impressora='{impressora}' linhas={len(linhas)} modo={modo}")

    # Espaçamento Y dinâmico em 0.1mm
    altura_mm = dims.get('altura_mm', 25)
    margem_01mm = 20  # 2mm margem
    area_util = (altura_mm * 10) - (margem_01mm * 2)
    num_linhas = len(linhas)
    
    if num_linhas <= 1:
        espacamento = 0
    else:
        espacamento = min(area_util // num_linhas, 50)  # máximo 5mm entre linhas

    font = calibracao.get('fonte', dims.get('font', 2))
    rot = calibracao.get('rotacao', 0)
    contraste = calibracao.get('contraste', 14)
    
    ppla_lines = []
    for i, texto in enumerate(linhas):
        # Y começa do topo (alto valor) e desce - coordenadas em 0.1mm
        y = (altura_mm * 10) - margem_01mm - (i * espacamento)
        texto_truncado = texto[:dims['cols_max']]
        ppla_lines.append(_ppla_text(rot, font, 1, 1, max(y, margem_01mm), 10, texto_truncado, modo))
        logger.info(f"  [{i:02d}] Y={y:04d} F={font} modo={modo}: {texto_truncado[:50]}")

    # Usar calibracao completa incluindo contraste
    cal = {
        'margem_c': calibracao.get('margem_c', 0),
        'offset_r': calibracao.get('offset_r', 0),
        'contraste': contraste,
        'modo': modo,
    }
    comandos = _build_label(ppla_lines, dims, cal, modo)

    # Debug PPLA
    logger.info(f"\n{'='*60}")
    logger.info(f"[ROTUTX PPLA-{modo}] Comandos ({len(comandos)} bytes):")
    for i, line in enumerate(comandos.split('\r')):
        display = line.replace('\x02', '<STX>').replace('\n', '<LF>')
        logger.info(f"  [{i:02d}] {display}")
    logger.info(f"{'='*60}")

    resultado = enviar_para_impressora(impressora, comandos)

    if resultado.get("success"):
        return jsonify({
            "success": True,
            "linhas_impressas": len(linhas),
            "printer_used": impressora,
            "fonte": font,
            "req": req_num,
            "protocolo": f"PPLA-{modo}",
        })
    else:
        return jsonify({"success": False, "error": resultado.get("error", "Falha")}), 500


@app.route('/diagnostico-ppla', methods=['POST'])
def diagnostico_ppla():
    """Gera os comandos PPLA sem imprimir, para diagnóstico visual."""
    data = request.get_json() or {}
    impressora_req = data.get('impressora', '') or IMPRESSORA_PADRAO
    layout_tipo = data.get('layout_tipo', 'AMP_CX')
    farmacia = data.get('farmacia', {})
    calibracao = data.get('calibracao', {})

    # Dados de exemplo para diagnóstico
    rotulo_exemplo = data.get('rotulo', {
        'nomePaciente': 'PACIENTE TESTE DIAGNOSTICO',
        'nrRequisicao': '99999',
        'nrItem': '1',
        'nomeMedico': 'DR TESTE MEDICO',
        'prefixoCRM': 'CRM',
        'numeroCRM': '12345',
        'ufCRM': 'SP',
        'formula': 'FORMULA TESTE 10MG',
        'composicao': 'COMPOSICAO TESTE 10MG',
        'dataFabricacao': '01/01/2025',
        'dataValidade': '01/07/2025',
        'numeroRegistro': '123456',
        'posologia': 'TOMAR 1X AO DIA',
        'aplicacao': 'USO ORAL',
        'contem': '30 CAPSULAS',
        'lote': 'LT001',
        'ph': '7.0',
    })

    impressora = find_printer_match(impressora_req) or impressora_req
    dims = get_dims_by_layout(layout_tipo, impressora)
    gerador = GERADORES_PPLA.get(layout_tipo, gerar_ppla_ampcx)

    try:
        comandos = gerador(rotulo_exemplo, farmacia, dims, calibracao)
    except Exception as e:
        return jsonify({"success": False, "error": f"Erro ao gerar: {str(e)}"}), 500

    # Formatar para exibição legível
    linhas_display = []
    for line in comandos.split('\r'):
        display = line.replace('\x02', '<STX>').replace('\x03', '<ETX>')
        if display.strip():
            linhas_display.append(display)

    return jsonify({
        "success": True,
        "impressora_resolvida": impressora,
        "layout": layout_tipo,
        "dims": {
            "largura_mm": dims['largura_mm'],
            "altura_mm": dims['altura_mm'],
            "cols_max": dims['cols_max'],
        },
        "calibracao_usada": {
            "margem_c": calibracao.get('margem_c', 0),
            "offset_r": calibracao.get('offset_r', 0),
            "contraste": calibracao.get('contraste', 12),
            "fonte": calibracao.get('fonte', 2),
            "rotacao": calibracao.get('rotacao', 0),
        },
        "comandos_ppla": linhas_display,
        "comandos_raw": comandos,
        "total_bytes": len(comandos.encode('cp1252', errors='replace')),
    })






# ============================================
# ENDPOINT /raw - Recebe bytes RAW (base64) e imprime direto
# ============================================
@app.route('/raw', methods=['POST'])
def raw_print():
    """Recebe dados RAW em base64 e envia direto para a impressora."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Nenhum dado recebido"}), 400

        impressora_req = data.get('impressora', '') or IMPRESSORA_PADRAO
        raw_b64 = data.get('dados_base64') or data.get('raw_base64') or ''

        if not raw_b64:
            return jsonify({"success": False, "error": "Nenhum dado base64 recebido"}), 400

        impressora = find_printer_match(impressora_req) or impressora_req

        import base64
        raw_bytes = base64.b64decode(raw_b64)

        logger.info(f"\n{'='*60}")
        logger.info(f"[RAW] Impressora: {impressora}")
        logger.info(f"[RAW] Tamanho: {len(raw_bytes)} bytes")
        logger.info(f"[RAW] Primeiros 100 bytes (hex): {raw_bytes[:100].hex(' ')}")

        try:
            preview = raw_bytes[:200].decode('latin-1', errors='ignore')
            logger.info(f"[RAW] Preview texto: {repr(preview)}")
        except Exception:
            pass

        formato = "DESCONHECIDO"
        if b'\x02L' in raw_bytes or b'\x02l' in raw_bytes:
            formato = "PPLB"
        elif b'^w' in raw_bytes or b'^W' in raw_bytes:
            formato = "PPLA"
        elif b'~' in raw_bytes[:10]:
            formato = "ZPL"
        elif b'\x1b' in raw_bytes[:20]:
            formato = "ESC/POS"
        logger.info(f"[RAW] Formato detectado: {formato}")

        if formato == "PPLA" and not raw_bytes.strip().endswith(b'^E'):
            raw_bytes = raw_bytes.strip() + b'\r\n^E\r\n'
        if formato == "PPLB":
            stripped = raw_bytes.strip()
            if not stripped.endswith(b'E') and not stripped.endswith(b'\rE'):
                raw_bytes = raw_bytes.strip() + b'\rE\r'

        logger.info(f"{'='*60}")

        resultado = enviar_para_impressora(impressora, raw_bytes, aplicar_startup_guard=False)

        if resultado.get("success"):
            return jsonify({
                "success": True,
                "bytes_enviados": len(raw_bytes),
                "formato_detectado": formato,
                "impressora": impressora,
            })
        else:
            return jsonify({
                "success": False,
                "error": resultado.get("error", "Falha ao enviar para impressora"),
                "formato_detectado": formato,
            }), 500

    except Exception as e:
        logger.error(f"[RAW] Erro: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================
# ENDPOINT /teste-ppla-direto - Recebe texto PPLA capturado e envia direto
# ============================================
@app.route('/teste-ppla-direto', methods=['POST'])
def teste_ppla_direto():
    """Recebe comandos PPLA em texto puro (capturados do Fórmula Certa) e envia direto para a impressora.
    Aceita o formato exato capturado: f289\\nL\\ne\\nPA\\nD11\\nH14\\n...\\nQ0001E
    Converte \\n para \\r\\n e adiciona STX (\\x02) antes de 'L' se necessário."""
    try:
        data = request.get_json()
        if not data:
            return jsonify({"success": False, "error": "Nenhum dado recebido"}), 400

        impressora_req = data.get('impressora', '') or IMPRESSORA_PADRAO
        ppla_texto = data.get('ppla', '')

        if not ppla_texto:
            return jsonify({"success": False, "error": "Nenhum comando PPLA recebido"}), 400

        impressora = find_printer_match(impressora_req) or impressora_req

        # Separar em blocos de etiqueta (cada bloco começa com f289 ou similar)
        # Normalizar line endings
        ppla_texto = ppla_texto.replace('\r\n', '\n').replace('\r', '\n')

        # Separar blocos por padrão "f" seguido de números (ex: f289)
        import re as re_local
        blocos_raw = re_local.split(r'(?=^f\d)', ppla_texto, flags=re_local.MULTILINE)
        blocos = [b.strip() for b in blocos_raw if b.strip()]

        logger.info(f"[PPLA-DIRETO] Impressora: {impressora}")
        logger.info(f"[PPLA-DIRETO] {len(blocos)} bloco(s) de etiqueta detectado(s)")

        # Converter cada bloco para formato binário correto
        comandos_finais = b""
        for i, bloco in enumerate(blocos):
            linhas = bloco.split('\n')
            # Reconstruir com \r como separador (PPLA usa CR)
            # Substituir início: "f289\nL" -> STX + "L"  (f289 = form feed, ignoramos)
            ppla_bin = b""
            for linha in linhas:
                linha = linha.strip()
                if not linha:
                    continue
                # "L" sozinho no início = entrar modo formatação (precisa de STX)
                if linha == 'L':
                    ppla_bin += b"\x02L\r"
                elif linha.startswith('f') and linha[1:].isdigit():
                    # f289 = form length command - ESSENCIAL para definir tamanho da etiqueta
                    ppla_bin += b"\x02" + linha.encode('cp1252', errors='replace') + b"\r"
                elif linha == 'e':
                    # Gap sensor ON
                    ppla_bin += b"\x02e\r"
                elif linha.startswith('Q') and linha.endswith('E'):
                    # Q0001E = quantidade + fim - separar
                    q_part = linha[:-1]  # Q0001
                    ppla_bin += q_part.encode('cp1252', errors='replace') + b"\r"
                    ppla_bin += b"E\r"
                else:
                    ppla_bin += linha.encode('cp1252', errors='replace') + b"\r"

            comandos_finais += ppla_bin
            logger.info(f"  Bloco {i+1}: {len(ppla_bin)} bytes")

        logger.info(f"[PPLA-DIRETO] Total: {len(comandos_finais)} bytes")
        logger.info(f"[PPLA-DIRETO] Preview: {comandos_finais[:200]}")

        # Enviar como texto latin-1 (decodificar bytes para string)
        resultado = enviar_para_impressora(impressora, comandos_finais.decode('latin-1', errors='replace'))

        if resultado.get("success"):
            return jsonify({
                "success": True,
                "message": f"{len(blocos)} etiqueta(s) enviada(s) via PPLA direto",
                "blocos": len(blocos),
                "bytes_enviados": len(comandos_finais),
                "impressora": impressora,
            })
        else:
            return jsonify({
                "success": False,
                "error": resultado.get("error", "Falha ao enviar"),
            }), 500

    except Exception as e:
        logger.error(f"[PPLA-DIRETO] Erro: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================
# AUTO-UPDATE via GitHub (polling automático)
# ============================================
GITHUB_RAW_URL = "https://raw.githubusercontent.com/marketingpropharmacos/data-label-automaton/main/agente_impressao.py"
AGENT_FILE = os.path.abspath(__file__)
UPDATE_INTERVAL_SECONDS = 120  # verifica a cada 2 minutos


import hashlib

def _hash_arquivo(conteudo: str) -> str:
    return hashlib.md5(conteudo.encode("utf-8")).hexdigest()


def _codigo_atual() -> str:
    try:
        with open(AGENT_FILE, "r", encoding="utf-8") as f:
            return f.read()
    except Exception:
        return ""


def _fetch_latest_version() -> Optional[str]:
    try:
        import ssl
        ctx = ssl.create_default_context()
        ctx.check_hostname = False
        ctx.verify_mode = ssl.CERT_NONE
        req = urllib.request.Request(GITHUB_RAW_URL, headers={"Cache-Control": "no-cache"})
        with urllib.request.urlopen(req, timeout=10, context=ctx) as resp:
            return resp.read().decode("utf-8")
    except Exception as e:
        logger.warning(f"[UPDATE] Erro ao buscar GitHub: {e}")
        return None


def _aplicar_update(novo_codigo: str) -> bool:
    try:
        atual = _codigo_atual()
        backup_path = AGENT_FILE + ".bak"
        with open(backup_path, "w", encoding="utf-8") as f:
            f.write(atual)
        with open(AGENT_FILE, "w", encoding="utf-8") as f:
            f.write(novo_codigo)
        logger.info(f"[UPDATE] Arquivo atualizado. Backup em {backup_path}")
        return True
    except Exception as e:
        logger.error(f"[UPDATE] Erro ao salvar: {e}")
        return False


def _reiniciar():
    """Reinicia o processo. Usa subprocess no Windows (os.execv não funciona)."""
    def _do():
        time.sleep(2)
        logger.info("[UPDATE] Reiniciando agente...")
        try:
            import subprocess
            subprocess.Popen([sys.executable] + sys.argv, close_fds=True)
        except Exception as e:
            logger.error(f"[UPDATE] Erro ao reiniciar: {e}")
        finally:
            os._exit(0)  # força saída do processo atual
    threading.Thread(target=_do, daemon=True).start()


def _loop_auto_update():
    """Thread que roda em background e verifica o GitHub a cada UPDATE_INTERVAL_SECONDS."""
    logger.info(f"[UPDATE] Auto-update ativo — verificando a cada {UPDATE_INTERVAL_SECONDS}s")
    while True:
        time.sleep(UPDATE_INTERVAL_SECONDS)
        try:
            novo = _fetch_latest_version()
            if not novo:
                continue
            atual = _codigo_atual()
            if _hash_arquivo(novo) != _hash_arquivo(atual):
                logger.info("[UPDATE] Nova versão detectada no GitHub! Aplicando...")
                if _aplicar_update(novo):
                    _reiniciar()
                    break  # sai do loop — o processo vai reiniciar
            else:
                logger.debug("[UPDATE] Sem alterações no GitHub.")
        except Exception as e:
            logger.warning(f"[UPDATE] Erro no ciclo de verificação: {e}")


@app.route('/update', methods=['POST'])
def update_agent():
    """Força verificação e update imediato (sem esperar o ciclo automático)."""
    logger.info("[UPDATE] Update manual solicitado...")
    novo = _fetch_latest_version()
    if not novo:
        return jsonify({"success": False, "error": "Não foi possível baixar do GitHub"}), 500

    atual = _codigo_atual()
    if _hash_arquivo(novo) == _hash_arquivo(atual):
        return jsonify({"success": True, "message": "Já está na versão mais recente", "updated": False})

    if not _aplicar_update(novo):
        return jsonify({"success": False, "error": "Erro ao salvar arquivo"}), 500

    _reiniciar()
    return jsonify({"success": True, "message": "Atualizado! Reiniciando em 2 segundos...", "updated": True})


@app.route('/version', methods=['GET'])
def version_info():
    conteudo = _codigo_atual()
    return jsonify({
        "version": "3.2",
        "hash": _hash_arquivo(conteudo)[:8],
        "hostname": socket.gethostname(),
        "update_interval_seconds": UPDATE_INTERVAL_SECONDS,
        "file": AGENT_FILE,
    })


# ============================================
# SUPABASE HEARTBEAT — registro de status/URL
# ============================================
SUPABASE_URL_API = "https://uxcxmegxplthzrmwbeps.supabase.co"
SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV4Y3htZWd4cGx0aHpybXdiZXBzIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk3ODI1NTksImV4cCI6MjA4NTM1ODU1OX0.md7HPEL1xeNHgz7Fxf30pNZzb4WPQoPjF9r1Hd9DpPc"
HEARTBEAT_INTERVAL = 60  # segundos

_agente_id_cache = ""


def _get_agente_id() -> str:
    global _agente_id_cache
    if _agente_id_cache:
        return _agente_id_cache
    # 1) variável de ambiente
    val = os.environ.get("AGENTE_ID", "").strip()
    if val:
        _agente_id_cache = val
        return val
    # 2) arquivo agente_id.txt na pasta do agente
    id_file = os.path.join(os.path.dirname(AGENT_FILE), "agente_id.txt")
    if os.path.exists(id_file):
        try:
            with open(id_file, "r", encoding="utf-8") as f:
                val = f.read().strip()
            if val:
                _agente_id_cache = val
                return val
        except Exception:
            pass
    return ""


def _get_ngrok_url() -> str:
    """Detecta a URL pública do ngrok via API local (porta 4040)."""
    try:
        req = urllib.request.Request("http://localhost:4040/api/tunnels")
        with urllib.request.urlopen(req, timeout=3) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            for tunnel in data.get("tunnels", []):
                if tunnel.get("proto") == "https":
                    return tunnel.get("public_url", "")
            tunnels = data.get("tunnels", [])
            if tunnels:
                return tunnels[0].get("public_url", "")
    except Exception:
        pass
    return ""


def _registrar_supabase(url: str, status: str = "online"):
    """Envia heartbeat ao Supabase atualizando status, URL e ultimo_ping."""
    agente_id = _get_agente_id()
    if not agente_id:
        return
    now_iso = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    payload = json.dumps({
        "url": url,
        "hostname": socket.gethostname(),
        "versao": "3.2",
        "status": status,
        "ultimo_ping": now_iso,
        "atualizado_em": now_iso,
    }).encode("utf-8")
    endpoint = f"{SUPABASE_URL_API}/rest/v1/agentes_status?id=eq.{agente_id}"
    req = urllib.request.Request(
        endpoint,
        data=payload,
        method="PATCH",
        headers={
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY,
            "Authorization": f"Bearer {SUPABASE_ANON_KEY}",
            "Prefer": "return=minimal",
        },
    )
    urllib.request.urlopen(req, timeout=5)


def _loop_heartbeat():
    """Thread de heartbeat: registra URL e status no Supabase a cada 60s."""
    logger.info(f"[HEARTBEAT] Iniciado — intervalo {HEARTBEAT_INTERVAL}s")
    while True:
        try:
            url = _get_ngrok_url()
            _registrar_supabase(url, "online")
            logger.debug(f"[HEARTBEAT] OK — url={url or '(sem ngrok)'}")
        except Exception as e:
            logger.debug(f"[HEARTBEAT] Erro: {e}")
        time.sleep(HEARTBEAT_INTERVAL)


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5002))
    logger.info("=" * 50)
    logger.info("Agente de Impressao PPLA - ProPharmacos V3.2")
    logger.info(f"Hostname: {socket.gethostname()}")
    logger.info(f"Porta: {port}")
    logger.info(f"Impressora padrao: {IMPRESSORA_PADRAO}")
    logger.info(f"pywin32 disponivel: {PYWIN32_OK}")
    logger.info(f"Impressoras: {get_available_printers()}")
    logger.info(f"Layouts: {list(GERADORES_PPLA.keys())}")
    logger.info(f"Endpoints: /health /impressoras /imprimir /imprimir-rotutx /raw /teste /teste-dots /teste-ppla-direto /diagnostico-ppla /update /version")
    for k, v in PRINTER_CONFIGS.items():
        logger.info(f"  {k}: {v['largura_mm']}x{v['altura_mm']}mm ({v['cols_max']} cols)")
    logger.info(f"Health: http://localhost:{port}/health")
    logger.info(f"Auto-update: verificando GitHub a cada {UPDATE_INTERVAL_SECONDS}s")
    agente_id = _get_agente_id()
    logger.info(f"Agente ID: {agente_id or '(não configurado — crie agente_id.txt)'}")
    logger.info("=" * 50)

    # Iniciar thread de auto-update em background
    t = threading.Thread(target=_loop_auto_update, daemon=True)
    t.start()

    # Iniciar thread de heartbeat Supabase
    th = threading.Thread(target=_loop_heartbeat, daemon=True)
    th.start()

    # Registrar imediatamente ao iniciar (não esperar 60s)
    def _registro_inicial():
        time.sleep(5)  # aguarda ngrok subir
        try:
            url = _get_ngrok_url()
            _registrar_supabase(url, "online")
            logger.info(f"[HEARTBEAT] Registro inicial OK — url={url or '(sem ngrok)'}")
        except Exception as e:
            logger.debug(f"[HEARTBEAT] Registro inicial falhou: {e}")
    threading.Thread(target=_registro_inicial, daemon=True).start()

    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
