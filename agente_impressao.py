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

IMPRESSORA_PADRAO = "AMP PEQUENO"

# ============================================
# Configurações de dimensão por impressora (em mm e dots)
# Coordenadas PPLA em 0.1mm (modo 'm')
# ============================================
PRINTER_CONFIGS = {
    'PEQUEN': {
        'largura_mm': 45, 'altura_mm': 25,
        'largura_dots': 360, 'altura_dots': 200, 'gap_dots': 24,
        'cols_max': 38,
        # Coordenadas Y em 0.1mm (origem bottom-left, PPLA)
        # Para 25mm: Y=220 é 3mm do topo, Y=020 é 23mm do topo
        'y_positions_mm': [220, 180, 140, 100, 70, 40, 20],
        'font': 2,  # Fonte 2 conforme documentação
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
        'font': 2,
    },
}

def get_printer_dims(nome_impressora):
    """Seleciona dimensões baseado no nome da impressora."""
    nome = (nome_impressora or '').upper()
    if 'AMP10' in nome or 'AMPOLA 10' in nome:
        return PRINTER_CONFIGS['AMP10']
    for chave, dims in PRINTER_CONFIGS.items():
        if chave in nome:
            return dims
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
    Coordenadas em 0.1mm (4 dígitos). Ex: 0220 = 22.0mm do bottom."""
    return f"1{rot}{font}{wmult}{hmult}{y_01mm:04d}{x_01mm:04d}{data}"


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
        "D11",              # Pixel size
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
def ppla_text_dots(rot, font, wmult, hmult, y_dots, x_dots, data):
    """Gera uma linha de texto PPLA em modo dots.
    Coordenadas em dots (4 dígitos). Ex: 0160 = 160 dots = ~20mm do bottom."""
    return f"1{rot}{font}{wmult}{hmult}{y_dots:04d}{x_dots:04d}{data}"


def ppla_setup_dots(largura_dots=360, altura_dots=200, gap_dots=24, contraste=14, velocidade='C'):
    """Gera bloco de setup PPLA MÍNIMO em modo DOTS.
    
    Compatível com Fórmula Certa - APENAS os comandos essenciais:
    STX L (entrar formatação), D11 (pixel), H (contraste).
    SEM \x02e, SEM Q, SEM q, SEM P - o mínimo absoluto.
    """
    partes = [
        f"\x02L",                          # Entrar modo formatação
        f"D11",                            # Pixel size
        f"H{contraste:02d}",              # Contraste
    ]
    return "\r".join(partes) + "\r"


def ppla_full_label_dots(linhas_texto, largura_dots=360, altura_dots=200, gap_dots=24, contraste=14, velocidade='C'):
    """Monta etiqueta PPLA completa em modo DOTS: setup + conteúdo + E."""
    setup = ppla_setup_dots(largura_dots, altura_dots, gap_dots, contraste, velocidade)
    content = "\r".join(linhas_texto)
    return setup + content + "\r" + "E\r"


def mm_to_dots(value_01mm):
    """Converte coordenada de 0.1mm para dots (203 DPI).
    203 DPI = 8 dots/mm, então 0.1mm = 0.8 dots."""
    return int(value_01mm * 0.8)


# ============================================
# COMPATIBILIDADE: Manter funções PPLB antigas para fallback
# ============================================
def pplb_text(rot, font, wmult, hmult, y, x, data):
    """Gera uma linha de texto PPLA (4 dígitos para Y e X)."""
    return f"1{rot}{font}{wmult}{hmult}{y:04d}{x:04d}{data}"

def pplb_setup(largura_dots=360, altura_dots=200, gap_dots=24):
    """Setup PPLB em dots (legado)."""
    partes = [f"q{largura_dots}", f"Q{altura_dots},{gap_dots}", "D11"]
    return "\r".join(partes) + "\r"

def pplb_label(linhas):
    """Bloco de etiqueta PPLB (legado)."""
    partes = ["\x02L", "H10"]
    partes.extend(linhas)
    partes.append("E")
    return "\r".join(partes) + "\r"


# ============================================
# HELPERS de dados
# ============================================
def _crm_completo(rotulo):
    prefixo = rotulo.get('prefixoCRM', '')
    numero = rotulo.get('numeroCRM', '')
    uf = rotulo.get('ufCRM', '')
    return f"{prefixo}{numero}/{uf}".strip('/')

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

def gerar_ppla_ampcx(rotulo, farmacia, dims=None, calibracao=None):
    """Layout AMP_CX (109x25mm) - 8 linhas."""
    if not dims:
        dims = PRINTER_CONFIGS['GRAND']
    cal = calibracao or {}
    modo = cal.get('modo', 'mm')
    cols = dims['cols_max']
    font = cal.get('fonte', dims.get('font', 2))
    rot = cal.get('rotacao', 1)
    
    paciente = (rotulo.get('nomePaciente', '') or '')[:cols].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    composicao = _composicao(rotulo, cols)
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
        _ppla_text(rot, font, 1, 1, y_pos[3], x_start, linha_meta, modo),
        _ppla_text(rot, font, 1, 1, y_pos[4], x_start, f"APLICACAO: {aplicacao}", modo),
        _ppla_text(rot, font, 1, 1, y_pos[5], x_start, f"CONTEM: {contem}", modo),
        _ppla_text(rot, font, 1, 1, y_pos[6], x_start, f"Reg: {registro}", modo),
    ]
    
    return _build_label(linhas, dims, cal, modo)


def gerar_ppla_amp10(rotulo, farmacia, dims=None, calibracao=None):
    """Layout AMP10 (89x38mm) - 8 linhas."""
    if not dims:
        dims = PRINTER_CONFIGS['AMP10']
    cal = calibracao or {}
    modo = cal.get('modo', 'mm')
    cols = dims['cols_max']
    font = cal.get('fonte', dims.get('font', 2))
    rot = cal.get('rotacao', 1)
    
    paciente = (rotulo.get('nomePaciente', '') or '')[:cols].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    composicao = _composicao(rotulo, cols)
    linha_meta = _linha_meta(rotulo)
    registro = str(rotulo.get('numeroRegistro', '') or '')
    aplicacao = (rotulo.get('aplicacao', '') or '')[:30].upper()
    contem = (rotulo.get('contem', '') or '')[:30].upper()
    
    y_pos = [350, 310, 270, 230, 190, 150, 110, 70]
    x_start = 10
    
    linhas = [
        _ppla_text(rot, font, 1, 1, y_pos[0], x_start, paciente, modo),
        _ppla_text(rot, font, 1, 1, y_pos[0], 400, f"REQ:{nr_req}-{nr_item}", modo),
        _ppla_text(rot, font, 1, 1, y_pos[1], x_start, f"DR. {nome_medico[:25]} CRM {crm}", modo),
        _ppla_text(rot, font, 1, 1, y_pos[2], x_start, composicao, modo),
        _ppla_text(rot, font, 1, 1, y_pos[3], x_start, linha_meta, modo),
        _ppla_text(rot, font, 1, 1, y_pos[4], x_start, f"REG: {registro}", modo),
        _ppla_text(rot, font, 1, 1, y_pos[5], x_start, f"APLICACAO: {aplicacao}", modo),
        _ppla_text(rot, font, 1, 1, y_pos[6], x_start, f"CONTEM: {contem}", modo),
    ]
    
    return _build_label(linhas, dims, cal, modo)


def gerar_ppla_a_pac_peq(rotulo, farmacia, dims=None, calibracao=None):
    """Layout A.PAC.PEQ (45x25mm)."""
    if not dims:
        dims = PRINTER_CONFIGS['PEQUEN']
    cal = calibracao or {}
    modo = cal.get('modo', 'mm')
    cols = dims['cols_max']
    font = cal.get('fonte', dims.get('font', 2))
    rot = cal.get('rotacao', 1)
    
    texto_livre = rotulo.get('textoLivre', '')
    if texto_livre:
        linhas_texto = texto_livre.split('\n')
        y_positions = [220, 180, 140, 100, 70, 40, 20]
        pplb_lines = []
        for i, y in enumerate(y_positions):
            line_text = linhas_texto[i] if i < len(linhas_texto) else ''
            if line_text.strip():
                pplb_lines.append(_ppla_text(rot, font, 1, 1, y, 10, line_text[:cols], modo))
        if not pplb_lines:
            paciente = (rotulo.get('nomePaciente', '') or 'SEM DADOS')[:cols].upper()
            pplb_lines.append(_ppla_text(rot, font, 1, 1, 220, 10, paciente, modo))
        
        return _build_label(pplb_lines, dims, cal, modo)
    
    paciente = (rotulo.get('nomePaciente', '') or '')[:25].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()[:16]
    crm = _crm_completo(rotulo)[:15]
    registro = str(rotulo.get('numeroRegistro', '') or '')[:8]
    
    w = cols
    req_str = f"REQ:{nr_req}-{nr_item}"[:11]
    line1 = (paciente + ' ' * w)[:w - len(req_str)] + req_str
    dr_str = f"DR(A){nome_medico}"
    line2 = (dr_str + ' ' * w)[:w - len(crm)] + crm
    reg_str = f"REG:{registro}" if registro else ""
    line3 = (' ' * (w - len(reg_str))) + reg_str if reg_str else ""
    
    linhas = []
    if line1.strip():
        linhas.append(_ppla_text(rot, font, 1, 1, 220, 10, line1[:w], modo))
    if line2.strip():
        linhas.append(_ppla_text(rot, font, 1, 1, 170, 10, line2[:w], modo))
    if line3.strip():
        linhas.append(_ppla_text(rot, font, 1, 1, 120, 10, line3[:w], modo))
    
    return _build_label(linhas, dims, cal, modo)


def gerar_ppla_a_pac_gran(rotulo, farmacia, dims=None, calibracao=None):
    """Layout A.PAC.GRAN (76x25mm) - 3 campos."""
    if not dims:
        dims = PRINTER_CONFIGS['GRAND']
    cal = calibracao or {}
    modo = cal.get('modo', 'mm')
    cols = dims['cols_max']
    font = cal.get('fonte', dims.get('font', 2))
    rot = cal.get('rotacao', 1)
    
    paciente = (rotulo.get('nomePaciente', '') or '')[:cols].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    
    linhas = [
        _ppla_text(rot, font, 1, 1, 200, 10, paciente, modo),
        _ppla_text(rot, font, 1, 1, 130, 10, f"REQ:{nr_req}-{nr_item}", modo),
        _ppla_text(rot, font, 1, 1, 60,  10, f"DR.{nome_medico[:40]} {crm}", modo),
    ]
    
    return _build_label(linhas, dims, cal, modo)


def gerar_ppla_tirz(rotulo, farmacia, dims=None, calibracao=None):
    """Layout TIRZ/Tirzepatida (109x25mm) - 8 linhas."""
    if not dims:
        dims = PRINTER_CONFIGS['GRAND']
    cal = calibracao or {}
    modo = cal.get('modo', 'mm')
    cols = dims['cols_max']
    font = cal.get('fonte', dims.get('font', 2))
    rot = cal.get('rotacao', 1)
    
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

# Alias para compatibilidade
GERADORES_PPLB = GERADORES_PPLA


# ============================================
# ENVIO PARA IMPRESSORA
# ============================================
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


def enviar_para_impressora(nome_impressora, comandos):
    """Envia comandos PPLA para a impressora com fallback de RAW/XPS_PASS.
    Usa encoding cp1252 conforme documentação Argox."""
    if not PYWIN32_OK:
        logger.info(f"[SIMULAÇÃO] Enviando para {nome_impressora}:\n{comandos[:500]}")
        return {"success": True, "message": "Simulação OK"}

    raw_type = _detectar_raw_type(nome_impressora)
    logger.info(f"Usando datatype '{raw_type}' para '{nome_impressora}'")

    # Encoding cp1252 conforme recomendação da documentação
    dados = comandos.encode('cp1252', errors='replace')

    try:
        hPrinter = win32print.OpenPrinter(nome_impressora)
        try:
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Etiqueta PPLA", None, raw_type))
            try:
                win32print.StartPagePrinter(hPrinter)
                win32print.WritePrinter(hPrinter, dados)
                win32print.EndPagePrinter(hPrinter)
            finally:
                win32print.EndDocPrinter(hPrinter)
        finally:
            win32print.ClosePrinter(hPrinter)
        return {"success": True}
    except Exception as e:
        # Fallback
        fallback_type = "RAW" if raw_type == "XPS_PASS" else "XPS_PASS"
        logger.warning(f"Falha com '{raw_type}', tentando fallback '{fallback_type}': {e}")
        try:
            hPrinter = win32print.OpenPrinter(nome_impressora)
            try:
                hJob = win32print.StartDocPrinter(hPrinter, 1, ("Etiqueta PPLA", None, fallback_type))
                try:
                    win32print.StartPagePrinter(hPrinter)
                    win32print.WritePrinter(hPrinter, dados)
                    win32print.EndPagePrinter(hPrinter)
                finally:
                    win32print.EndDocPrinter(hPrinter)
            finally:
                win32print.ClosePrinter(hPrinter)
            return {"success": True}
        except Exception as e2:
            return {"success": False, "error": f"RAW falhou: {e} | XPS_PASS falhou: {e2}"}


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
    
    # Calibração: margem C e offset R (enviados pelo frontend)
    calibracao = data.get('calibracao', {})

    if not rotulos:
        return jsonify({"success": False, "error": "Nenhum rótulo para imprimir"}), 400

    impressora = find_printer_match(impressora_req) or impressora_req
    logger.info(f"Impressora solicitada: '{impressora_req}' -> resolvida: '{impressora}'")
    logger.info(f"Calibração: C={calibracao.get('margem_c', 0)} R={calibracao.get('offset_r', 0)} Font={calibracao.get('fonte', 2)} Rot={calibracao.get('rotacao', 1)} Modo={calibracao.get('modo', 'mm')}")

    gerador = GERADORES_PPLA.get(layout_tipo, gerar_ppla_ampcx)
    dims = get_printer_dims(impressora)

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
    """Recebe linhas de texto extraídas do ROTUTX (FC12300) e imprime via PPLA mm."""
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Nenhum dado recebido"}), 400

    impressora_req = data.get('impressora', '') or IMPRESSORA_PADRAO
    linhas = data.get('linhas', [])
    req_num = data.get('req', '?')
    calibracao = data.get('calibracao', {})

    if not linhas:
        return jsonify({"success": False, "error": "Nenhuma linha de texto recebida"}), 400

    impressora = find_printer_match(impressora_req) or impressora_req
    dims = get_printer_dims(impressora)
    logger.info(f"[ROTUTX] REQ={req_num} impressora='{impressora}' linhas={len(linhas)}")

    # Espaçamento Y dinâmico em 0.1mm
    altura_mm = dims.get('altura_mm', 25)
    margem_01mm = 20  # 2mm margem
    area_util = (altura_mm * 10) - (margem_01mm * 2)
    num_linhas = len(linhas)
    
    if num_linhas <= 1:
        espacamento = 0
    else:
        espacamento = min(area_util // num_linhas, 50)  # máximo 5mm entre linhas

    font = dims.get('font', 2)
    ppla_lines = []
    for i, texto in enumerate(linhas):
        # Y começa do topo (alto valor) e desce
        y = (altura_mm * 10) - margem_01mm - (i * espacamento)
        texto_truncado = texto[:dims['cols_max']]
        ppla_lines.append(ppla_text_mm(1, font, 1, 1, max(y, margem_01mm), 10, texto_truncado))
        logger.info(f"  [{i:02d}] Y={y:04d} F={font}: {texto_truncado[:50]}")

    comandos = ppla_full_label(
        ppla_lines,
        altura_mm=altura_mm,
        margem_c=calibracao.get('margem_c', 0),
        offset_r=calibracao.get('offset_r', 0),
    )

    # Debug PPLA
    logger.info(f"\n{'='*60}")
    logger.info(f"[ROTUTX PPLA-mm] Comandos ({len(comandos)} bytes):")
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
            "protocolo": "PPLA-mm",
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
    dims = get_printer_dims(impressora)
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
            "rotacao": calibracao.get('rotacao', 1),
        },
        "comandos_ppla": linhas_display,
        "comandos_raw": comandos,
        "total_bytes": len(comandos.encode('cp1252', errors='replace')),
    })


@app.route('/analisar-prn', methods=['POST'])
def analisar_prn():
    """Recebe caminho de um arquivo .PRN capturado e analisa os bytes."""
    data = request.get_json() or {}
    caminho = data.get('caminho', '')

    if not caminho or not os.path.exists(caminho):
        return jsonify({"success": False, "error": f"Arquivo não encontrado: {caminho}"}), 400

    try:
        with open(caminho, 'rb') as f:
            raw = f.read()

        tamanho = len(raw)
        count_crlf = raw.count(b'\r\n')
        count_lf = raw.count(b'\n') - count_crlf
        count_cr = raw.count(b'\r') - count_crlf
        stx_positions = [i for i, b in enumerate(raw) if b == 0x02]

        try:
            texto = raw.decode('cp1252', errors='replace')
        except Exception:
            texto = raw.decode('latin-1', errors='replace')

        linhas = texto.replace('\r\n', '\n').replace('\r', '\n').split('\n')
        linhas_display = []
        for i, linha in enumerate(linhas[:100]):
            display = linha.replace('\x02', '<STX>').replace('\x03', '<ETX>')
            linhas_display.append(f"[{i:03d}] {display}")

        resultado = {
            "success": True,
            "tamanho_bytes": tamanho,
            "terminadores": {
                "CRLF (\\r\\n)": count_crlf,
                "LF (\\n)": count_lf,
                "CR (\\r)": count_cr,
            },
            "stx_positions": stx_positions[:20],
            "total_stx": len(stx_positions),
            "hex_primeiros_500bytes": raw[:500].hex(' '),
            "linhas_texto": linhas_display,
        }

        return jsonify(resultado)

    except Exception as e:
        logger.error(f"Erro ao analisar PRN: {e}")
        return jsonify({"success": False, "error": str(e)}), 500


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

        resultado = enviar_para_impressora(impressora, raw_bytes.decode('latin-1', errors='replace'))

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


@app.route('/test_notepad', methods=['POST'])
def test_notepad():
    """Salva conteudo RAW em arquivo para inspecao visual."""
    try:
        import base64
        import tempfile
        import subprocess

        data = request.get_json() or {}
        raw_b64 = data.get('dados_base64') or data.get('raw_base64') or ''

        if not raw_b64:
            return jsonify({"success": False, "error": "Nenhum dado base64"}), 400

        raw_bytes = base64.b64decode(raw_b64)
        temp_file = os.path.join(tempfile.gettempdir(), 'rotutx_debug.txt')
        with open(temp_file, 'wb') as f:
            f.write(raw_bytes)

        try:
            subprocess.Popen(['notepad.exe', temp_file])
        except Exception:
            pass

        analise = {"tamanho": len(raw_bytes), "arquivo": temp_file}
        if b'^w' in raw_bytes or b'^W' in raw_bytes:
            analise["formato"] = "PPLA"
        elif b'\x02L' in raw_bytes:
            analise["formato"] = "PPLB"
        elif b'~' in raw_bytes[:10]:
            analise["formato"] = "ZPL"
        elif b'\x1b' in raw_bytes[:20]:
            analise["formato"] = "ESC/POS"
        else:
            analise["formato"] = "DESCONHECIDO"

        try:
            analise["preview_texto"] = raw_bytes[:500].decode('latin-1', errors='ignore')
        except Exception:
            analise["preview_texto"] = "(nao decodificavel)"

        analise["tem_E_final"] = raw_bytes.strip().endswith(b'E') or raw_bytes.strip().endswith(b'^E')
        analise["count_CR"] = raw_bytes.count(b'\r')
        analise["count_LF"] = raw_bytes.count(b'\n')
        analise["count_CRLF"] = raw_bytes.count(b'\r\n')
        analise["count_STX"] = raw_bytes.count(b'\x02')

        return jsonify({"success": True, "analise": analise})

    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/raw_tcp', methods=['POST'])
def raw_tcp():
    """Envia dados RAW direto para a impressora via TCP porta 9100."""
    try:
        import base64

        data = request.get_json() or {}
        host = data.get('host', '')
        port = int(data.get('port', 9100))
        raw_b64 = data.get('dados_base64') or data.get('raw_base64') or ''

        if not host:
            return jsonify({"success": False, "error": "Informe 'host' (IP da impressora)"}), 400
        if not raw_b64:
            return jsonify({"success": False, "error": "Nenhum dado base64"}), 400

        raw_bytes = base64.b64decode(raw_b64)
        logger.info(f"[TCP] Enviando {len(raw_bytes)} bytes para {host}:{port}")

        s = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        s.settimeout(10)
        s.connect((host, port))
        s.sendall(raw_bytes)
        s.close()

        logger.info(f"[TCP] Enviado com sucesso para {host}:{port}")
        return jsonify({
            "success": True,
            "bytes_enviados": len(raw_bytes),
            "host": host,
            "port": port,
        })

    except Exception as e:
        logger.error(f"[TCP] Erro: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/capturar', methods=['POST'])
def capturar_porta_9100():
    """Abre um servidor TCP temporário na porta 9100 para capturar
    os comandos enviados pelo Fórmula Certa (ou qualquer outro software).
    
    Fluxo:
    1. Frontend chama POST /capturar com {timeout: 30}
    2. Agente abre porta 9100 e aguarda UMA conexão
    3. Quando o FC envia os dados, o agente captura e retorna
    4. Se timeout expirar, retorna erro
    """
    try:
        import base64
        data = request.get_json() or {}
        timeout = min(int(data.get('timeout', 30)), 60)  # max 60s
        porta = int(data.get('porta', 9100))

        logger.info(f"[CAPTURA] Aguardando conexão na porta {porta} (timeout={timeout}s)...")

        server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        server.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
        server.settimeout(timeout)

        try:
            server.bind(('0.0.0.0', porta))
            server.listen(1)
        except OSError as e:
            server.close()
            return jsonify({
                "success": False,
                "error": f"Não foi possível abrir a porta {porta}: {str(e)}. Verifique se não há outro serviço usando esta porta."
            }), 400

        try:
            conn, addr = server.accept()
            logger.info(f"[CAPTURA] Conexão recebida de {addr}")
            conn.settimeout(5)

            # Receber todos os dados
            chunks = []
            while True:
                try:
                    chunk = conn.recv(4096)
                    if not chunk:
                        break
                    chunks.append(chunk)
                except socket.timeout:
                    break

            conn.close()
            server.close()

            raw_bytes = b''.join(chunks)
            logger.info(f"[CAPTURA] Recebidos {len(raw_bytes)} bytes de {addr}")

            if len(raw_bytes) == 0:
                return jsonify({
                    "success": False,
                    "error": "Conexão recebida mas nenhum dado foi enviado."
                }), 400

            # Análise dos dados capturados
            # Formatar comandos legíveis (similar ao diagnóstico)
            try:
                texto = raw_bytes.decode('cp1252', errors='replace')
            except Exception:
                texto = raw_bytes.decode('latin-1', errors='replace')

            # Substituir controles por representações visuais
            texto_visual = texto.replace('\x02', '<STX>').replace('\x03', '<ETX>')
            linhas = texto_visual.split('\r')
            linhas = [l for l in linhas if l.strip()]

            # Detectar formato
            formato = "DESCONHECIDO"
            if b'\x02L' in raw_bytes or b'\x02e' in raw_bytes:
                formato = "PPLA"
            elif b'\x02' in raw_bytes and b'E\r' in raw_bytes:
                formato = "PPLB"
            elif b'~' in raw_bytes[:10]:
                formato = "ZPL"
            elif b'\x1b' in raw_bytes[:20]:
                formato = "ESC/POS"

            return jsonify({
                "success": True,
                "origem": f"{addr[0]}:{addr[1]}",
                "bytes_recebidos": len(raw_bytes),
                "formato_detectado": formato,
                "comandos": linhas,
                "comandos_raw": texto_visual,
                "dados_base64": base64.b64encode(raw_bytes).decode('ascii'),
                "analise": {
                    "count_CR": raw_bytes.count(b'\r'),
                    "count_LF": raw_bytes.count(b'\n'),
                    "count_STX": raw_bytes.count(b'\x02'),
                    "tem_E_final": raw_bytes.strip().endswith(b'E') or raw_bytes.strip().endswith(b'E\r'),
                }
            })

        except socket.timeout:
            server.close()
            return jsonify({
                "success": False,
                "error": f"Timeout: nenhuma conexão recebida na porta {porta} em {timeout} segundos. Certifique-se de imprimir pelo Fórmula Certa apontando para o IP deste PC."
            }), 408

    except Exception as e:
        logger.error(f"[CAPTURA] Erro: {str(e)}")
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/diagnostico', methods=['GET'])
def diagnostico():
    """Retorna diagnostico completo do agente e impressoras."""
    printers = get_available_printers()
    diag = {
        "agente_versao": "3.0.0",
        "protocolo": "PPLA-mm (milímetros)",
        "hostname": socket.gethostname(),
        "sistema": platform.system(),
        "pywin32": PYWIN32_OK,
        "impressora_padrao": IMPRESSORA_PADRAO,
        "impressoras_disponiveis": printers,
        "layouts_suportados": list(GERADORES_PPLA.keys()),
        "configs_impressora": {k: v for k, v in PRINTER_CONFIGS.items()},
        "encoding": "cp1252",
    }

    if PYWIN32_OK:
        for p in printers:
            try:
                hPrinter = win32print.OpenPrinter(p)
                info = win32print.GetPrinter(hPrinter, 2)
                win32print.ClosePrinter(hPrinter)
                diag[f"printer_{p}"] = {
                    "driver": info.get("pDriverName", "?"),
                    "port": info.get("pPortName", "?"),
                    "datatype": info.get("pDatatype", "?"),
                    "status": info.get("Status", 0),
                }
            except Exception as e:
                diag[f"printer_{p}"] = {"error": str(e)}

    return jsonify(diag)


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5002))
    logger.info("=" * 50)
    logger.info("Agente de Impressao PPLA-mm - ProPharmacos V3.0")
    logger.info(f"Hostname: {socket.gethostname()}")
    logger.info(f"Porta: {port}")
    logger.info(f"Protocolo: PPLA modo milimetros (cp1252)")
    logger.info(f"Impressora padrao: {IMPRESSORA_PADRAO}")
    logger.info(f"pywin32 disponivel: {PYWIN32_OK}")
    logger.info(f"Impressoras: {get_available_printers()}")
    logger.info(f"Layouts: {list(GERADORES_PPLA.keys())}")
    logger.info(f"Endpoints: /health /impressoras /imprimir /raw /raw_tcp /test_notepad /diagnostico /capturar")
    for k, v in PRINTER_CONFIGS.items():
        logger.info(f"  {k}: {v['largura_mm']}x{v['altura_mm']}mm ({v['cols_max']} cols)")
    logger.info(f"Health: http://localhost:{port}/health")
    logger.info("=" * 50)
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
