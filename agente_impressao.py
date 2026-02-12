"""
Agente de Impressão Local Robusto - ProPharmacos V2.3
------------------------------------------------------------
Compatível com servidor.py (proxy central).
Protocolo PPLB puro (Argox OS-2140) com batch printing.
Melhorias V2.1 mantidas: logging, match de impressora, diagnóstico.

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

app = Flask("agente_impressao_v2")
CORS(app)

IMPRESSORA_PADRAO = "AMP PEQUENO"

# ============================================
# Configurações de dimensão por impressora
# ============================================
PRINTER_CONFIGS = {
    'PEQUEN': {'largura_dots': 360, 'altura_dots': 200, 'gap_dots': 24, 'cols_max': 38},
    'GRAND':  {'largura_dots': 607, 'altura_dots': 200, 'gap_dots': 24, 'cols_max': 57},
}

def get_printer_dims(nome_impressora):
    """Seleciona dimensões baseado no nome da impressora."""
    nome = (nome_impressora or '').upper()
    for chave, dims in PRINTER_CONFIGS.items():
        if chave in nome:
            return dims
    return PRINTER_CONFIGS['PEQUEN']


# ============================================
# Utilitários de Impressora (melhorias V2.1)
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

    # Match exato
    if requested in available:
        return requested
    # Case-insensitive sem espaços
    for p in available:
        if re.sub(r'\s+', '', p).lower() == requested_clean:
            return p
    # Match parcial
    for p in available:
        if requested_clean in re.sub(r'\s+', '', p).lower():
            return p
    return None


# ============================================
# PPLB TEXT HELPER
# ============================================
def pplb_text(rot, font, wmult, hmult, y, x, data):
    """Gera uma linha de texto PPLB."""
    return f"1{rot}{font}{wmult}{hmult}{y:05d}{x:05d}{data}"


def pplb_setup(largura_dots=360, altura_dots=200, gap_dots=24):
    """Gera comandos de configuração PPLB (antes dos blocos de etiqueta)."""
    partes = [
        f"q{largura_dots}",
        f"Q{altura_dots},{gap_dots}",
        "D11",
    ]
    return "\r\n".join(partes) + "\r\n"


def pplb_label(linhas):
    """Monta bloco de etiqueta PPLB com STX (sem comandos de dimensão)."""
    partes = [
        "\x02L",
        "H10",
    ]
    partes.extend(linhas)
    partes.append("E")
    return "\r\n".join(partes) + "\r\n"


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
# GERADORES PPLB POR LAYOUT
# ============================================
def gerar_pplb_ampcx(rotulo, farmacia, dims=None):
    """Layout AMP_CX - 7 linhas com composição e lote/pH."""
    if not dims:
        dims = PRINTER_CONFIGS['GRAND']
    paciente = (rotulo.get('nomePaciente', '') or '')[:dims['cols_max']].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    composicao = _composicao(rotulo, dims['cols_max'])
    linha_meta = _linha_meta(rotulo)
    aplicacao = (rotulo.get('aplicacao', '') or '')[:30].upper()
    contem = (rotulo.get('contem', '') or '')[:30].upper()
    registro = rotulo.get('numeroRegistro', '')

    return pplb_label([
        pplb_text(1, 2, 1, 1, 5,   10, paciente),
        pplb_text(1, 2, 1, 1, 5,  max(dims['largura_dots'] - 200, 200), f"REQ:{nr_req}-{nr_item}"),
        pplb_text(1, 2, 1, 1, 30,  10, f"DR. {nome_medico[:25]} CRM {crm}"),
        pplb_text(1, 2, 1, 1, 55,  10, composicao),
        pplb_text(1, 2, 1, 1, 80,  10, linha_meta),
        pplb_text(1, 2, 1, 1, 105, 10, f"APLICACAO: {aplicacao}"),
        pplb_text(1, 2, 1, 1, 130, 10, f"CONTEM: {contem}"),
        pplb_text(1, 2, 1, 1, 155, 10, f"Reg: {registro}"),
    ])


def gerar_pplb_amp10(rotulo, farmacia, dims=None):
    """Layout AMP10 - 7 linhas, REG na linha 5."""
    if not dims:
        dims = PRINTER_CONFIGS['GRAND']
    paciente = (rotulo.get('nomePaciente', '') or '')[:dims['cols_max']].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    composicao = _composicao(rotulo, dims['cols_max'])
    linha_meta = _linha_meta(rotulo)
    registro = rotulo.get('numeroRegistro', '')
    aplicacao = (rotulo.get('aplicacao', '') or '')[:30].upper()
    contem = (rotulo.get('contem', '') or '')[:30].upper()

    return pplb_label([
        pplb_text(1, 2, 1, 1, 5,   10, paciente),
        pplb_text(1, 2, 1, 1, 5,  max(dims['largura_dots'] - 200, 200), f"REQ:{nr_req}-{nr_item}"),
        pplb_text(1, 2, 1, 1, 30,  10, f"DR. {nome_medico[:25]} CRM {crm}"),
        pplb_text(1, 2, 1, 1, 55,  10, composicao),
        pplb_text(1, 2, 1, 1, 80,  10, linha_meta),
        pplb_text(1, 2, 1, 1, 105, 10, f"REG: {registro}"),
        pplb_text(1, 2, 1, 1, 130, 10, f"APLICACAO: {aplicacao}"),
        pplb_text(1, 2, 1, 1, 155, 10, f"CONTEM: {contem}"),
    ])


def gerar_pplb_a_pac_peq(rotulo, farmacia, dims=None):
    """Layout A.PAC.PEQ (45x25mm) - 3 campos: paciente, req, médico."""
    if not dims:
        dims = PRINTER_CONFIGS['PEQUEN']
    paciente = (rotulo.get('nomePaciente', '') or '')[:dims['cols_max']].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)

    return pplb_label([
        pplb_text(1, 2, 1, 1, 10,  10, paciente),
        pplb_text(1, 2, 1, 1, 60,  10, f"REQ:{nr_req}-{nr_item}"),
        pplb_text(1, 2, 1, 1, 110, 10, f"DR.{nome_medico[:25]} {crm}"),
    ])


def gerar_pplb_a_pac_gran(rotulo, farmacia, dims=None):
    """Layout A.PAC.GRAN (76x25mm) - 3 campos: paciente, req, médico."""
    if not dims:
        dims = PRINTER_CONFIGS['GRAND']
    paciente = (rotulo.get('nomePaciente', '') or '')[:dims['cols_max']].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)

    return pplb_label([
        pplb_text(1, 2, 1, 1, 10,  10, paciente),
        pplb_text(1, 2, 1, 1, 60,  10, f"REQ:{nr_req}-{nr_item}"),
        pplb_text(1, 2, 1, 1, 110, 10, f"DR.{nome_medico[:40]} {crm}"),
    ])


def gerar_pplb_tirz(rotulo, farmacia, dims=None):
    """Layout TIRZ (Tirzepatida) - 7 linhas com posologia."""
    if not dims:
        dims = PRINTER_CONFIGS['GRAND']
    paciente = (rotulo.get('nomePaciente', '') or '')[:dims['cols_max']].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    composicao = _composicao(rotulo, dims['cols_max'])
    posologia = (rotulo.get('posologia', '') or '')[:dims['cols_max']].upper()
    linha_meta = _linha_meta(rotulo)
    aplicacao = (rotulo.get('aplicacao', '') or '')[:30].upper()
    contem = (rotulo.get('contem', '') or '')[:30].upper()
    registro = rotulo.get('numeroRegistro', '')

    return pplb_label([
        pplb_text(1, 2, 1, 1, 5,   10, paciente),
        pplb_text(1, 2, 1, 1, 5,  max(dims['largura_dots'] - 200, 200), f"REQ:{nr_req}-{nr_item}"),
        pplb_text(1, 2, 1, 1, 30,  10, f"DR. {nome_medico[:25]} CRM {crm}"),
        pplb_text(1, 2, 1, 1, 55,  10, composicao),
        pplb_text(1, 2, 1, 1, 80,  10, posologia),
        pplb_text(1, 2, 1, 1, 105, 10, linha_meta),
        pplb_text(1, 2, 1, 1, 130, 10, f"APLICACAO: {aplicacao}"),
        pplb_text(1, 2, 1, 1, 155, 10, f"CONTEM: {contem}  REG:{registro}"),
    ])


# Mapa de geradores
GERADORES_PPLB = {
    'AMP_CX': gerar_pplb_ampcx,
    'AMP10': gerar_pplb_amp10,
    'A_PAC_PEQ': gerar_pplb_a_pac_peq,
    'A_PAC_GRAN': gerar_pplb_a_pac_gran,
    'TIRZ': gerar_pplb_tirz,
}


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


def enviar_para_impressora(nome_impressora, comandos_pplb):
    """Envia comandos PPLB para a impressora com fallback de RAW/XPS_PASS."""
    if not PYWIN32_OK:
        logger.info(f"[SIMULAÇÃO] Enviando para {nome_impressora}:\n{comandos_pplb[:500]}")
        return {"success": True, "message": "Simulação OK"}

    raw_type = _detectar_raw_type(nome_impressora)
    logger.info(f"Usando datatype '{raw_type}' para '{nome_impressora}'")

    try:
        hPrinter = win32print.OpenPrinter(nome_impressora)
        try:
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Etiqueta", None, raw_type))
            try:
                win32print.StartPagePrinter(hPrinter)
                dados = comandos_pplb.encode('cp850', errors='replace')
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
                hJob = win32print.StartDocPrinter(hPrinter, 1, ("Etiqueta", None, fallback_type))
                try:
                    win32print.StartPagePrinter(hPrinter)
                    dados = comandos_pplb.encode('cp850', errors='replace')
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
        "version": "2.3.0",
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
    """Imprime etiqueta de teste PPLB."""
    impressora_req = (request.json or {}).get('impressora', IMPRESSORA_PADRAO)
    impressora = find_printer_match(impressora_req) or impressora_req
    dims = get_printer_dims(impressora)

    setup = pplb_setup(dims['largura_dots'], dims['altura_dots'], dims['gap_dots'])
    label = pplb_label([
        pplb_text(1, 3, 1, 1, 30, 10, "*** TESTE ***"),
        pplb_text(1, 2, 1, 1, 80, 10, "PPLB OK - V2.3"),
        pplb_text(1, 2, 1, 1, 120, 10, f"Imp: {impressora}"),
        pplb_text(1, 2, 1, 1, 155, 10, f"q{dims['largura_dots']} Q{dims['altura_dots']}"),
    ])
    comandos = setup + label

    resultado = enviar_para_impressora(impressora, comandos)
    if resultado.get("success"):
        return jsonify({"success": True, "message": "Teste enviado com sucesso"})
    else:
        return jsonify({"success": False, "error": resultado.get("error", "Falha")}), 500


@app.route('/imprimir', methods=['POST'])
def imprimir():
    """Recebe JSON com rótulos e imprime via PPLB em batch único."""
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Nenhum dado recebido"}), 400

    impressora_req = data.get('impressora', '') or IMPRESSORA_PADRAO
    layout_tipo = data.get('layout_tipo', 'AMP_CX')
    farmacia = data.get('farmacia', {})
    rotulos = data.get('rotulos', [])

    if not rotulos:
        return jsonify({"success": False, "error": "Nenhum rótulo para imprimir"}), 400

    # Resolve impressora com match inteligente
    impressora = find_printer_match(impressora_req) or impressora_req
    logger.info(f"Impressora solicitada: '{impressora_req}' → resolvida: '{impressora}'")

    gerador = GERADORES_PPLB.get(layout_tipo, gerar_pplb_ampcx)
    dims = get_printer_dims(impressora)

    # Setup: comandos de dimensão UMA VEZ antes dos blocos de etiqueta
    setup = pplb_setup(dims['largura_dots'], dims['altura_dots'], dims['gap_dots'])

    # Batch: concatenar TODOS os blocos de etiqueta PPLB
    labels_todos = ""
    erros_geracao = []
    for rotulo in rotulos:
        try:
            label = gerador(rotulo, farmacia, dims)
            labels_todos += label
            logger.info(f"Rótulo {rotulo.get('id', '?')} layout={layout_tipo} dims=q{dims['largura_dots']}/Q{dims['altura_dots']} adicionado")
        except Exception as e:
            erros_geracao.append(f"Rótulo {rotulo.get('id', '?')}: {str(e)}")

    if not labels_todos:
        return jsonify({"success": False, "error": "Nenhum comando gerado", "erros": erros_geracao}), 500

    # Montar: setup + todos os blocos de etiqueta
    comandos_todos = setup + labels_todos

    # Debug: mostrar comandos PPLB
    logger.info(f"\n{'='*60}")
    logger.info(f"[DEBUG PPLB] Comandos completos ({len(comandos_todos)} bytes):")
    for i, line in enumerate(comandos_todos.split('\r\n')):
        display = line.replace('\x02', '<STX>')
        logger.info(f"  [{i:02d}] {display}")
    logger.info(f"{'='*60}")

    # Enviar TUDO em um único job
    logger.info(f"Enviando batch de {len(rotulos)} rótulos para '{impressora}'")
    resultado = enviar_para_impressora(impressora, comandos_todos)

    if resultado.get("success"):
        return jsonify({
            "success": True,
            "impressos": len(rotulos) - len(erros_geracao),
            "printer_used": impressora,
            "layout_used": layout_tipo,
            "erros": erros_geracao if erros_geracao else None
        })
    else:
        return jsonify({
            "success": False,
            "error": resultado.get("error", "Falha"),
            "erros": erros_geracao
        }), 500


if __name__ == '__main__':
    port = int(os.environ.get("PORT", 5001))
    logger.info("=" * 50)
    logger.info("Agente de Impressão PPLB - ProPharmacos V2.3")
    logger.info(f"Hostname: {socket.gethostname()}")
    logger.info(f"Porta: {port}")
    logger.info(f"Impressora padrão: {IMPRESSORA_PADRAO}")
    logger.info(f"pywin32 disponível: {PYWIN32_OK}")
    logger.info(f"Impressoras: {get_available_printers()}")
    logger.info(f"Layouts: {list(GERADORES_PPLB.keys())}")
    for k, v in PRINTER_CONFIGS.items():
        logger.info(f"  {k}: q{v['largura_dots']} Q{v['altura_dots']},{v['gap_dots']} ({v['cols_max']} cols)")
    logger.info(f"Health: http://localhost:{port}/health")
    logger.info("=" * 50)
    app.run(host='0.0.0.0', port=port, debug=False, threaded=True)
