"""
Agente de Impressão Local - ProPharmacos
Protocolo: PPLB (compatível Argox OS-2140)
Porta: 5001
Instalação: pip install flask flask-cors pywin32
Execução: python agente_impressao.py

Impressoras configuradas:
  AMP PEQUENA: 45x25mm → q360, Q200,24 (38 colunas úteis: 3-40)
  AMP GRANDE:  76x25mm → q607, Q200,24 (57 colunas úteis: 4-60)
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import platform

if platform.system() == 'Windows':
    try:
        import win32print
        PRINTING_AVAILABLE = True
    except ImportError:
        print("ERRO: pywin32 não instalado. Execute: pip install pywin32")
        PRINTING_AVAILABLE = False
else:
    PRINTING_AVAILABLE = False

app = Flask(__name__)
CORS(app)

IMPRESSORA_PADRAO = "AMP PEQUENO"

# Configurações de dimensão por impressora (nome contém a chave)
PRINTER_CONFIGS = {
    'PEQUEN': {'largura_dots': 360, 'altura_dots': 200, 'gap_dots': 24, 'cols_max': 38},
    'GRAND':  {'largura_dots': 607, 'altura_dots': 200, 'gap_dots': 24, 'cols_max': 57},
}

def get_printer_dims(nome_impressora):
    """Seleciona dimensões automaticamente baseado no nome da impressora."""
    nome = (nome_impressora or '').upper()
    for chave, dims in PRINTER_CONFIGS.items():
        if chave in nome:
            return dims
    # Fallback: AMP PEQUENA
    return PRINTER_CONFIGS['PEQUEN']


# ============================================
# PPLB TEXT HELPER
# ============================================

def pplb_text(rot, font, wmult, hmult, y, x, data):
    """Gera uma linha de texto PPLB."""
    return f"1{rot}{font}{wmult}{hmult}{y:05d}{x:05d}{data}"


def pplb_label(linhas, largura_dots=360, altura_dots=200, gap_dots=24):
    partes = [
        "\x02L",
        "H10",
        "D11",
        f"q{largura_dots}",
        f"Q{altura_dots},{gap_dots}",
    ]
    partes.extend(linhas)
    partes.append("E")
    return "\r\n".join(partes) + "\r\n"


# ============================================
# GERAÇÃO DE COMANDOS PPLB POR LAYOUT
# ============================================

def gerar_pplb_ampcx(rotulo, farmacia, dims=None):
    """Layout AMP_CX - usa dims da impressora selecionada"""
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
    ], largura_dots=dims['largura_dots'], altura_dots=dims['altura_dots'], gap_dots=dims['gap_dots'])


def gerar_pplb_amp10(rotulo, farmacia, dims=None):
    """Layout AMP10 - usa dims da impressora selecionada"""
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
    ], largura_dots=dims['largura_dots'], altura_dots=dims['altura_dots'], gap_dots=dims['gap_dots'])


def gerar_pplb_a_pac_peq(rotulo, farmacia, dims=None):
    """Layout A.PAC.PEQ (45x25mm = 360x200 dots) - 3 campos: paciente, req, médico"""
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
    ], largura_dots=dims['largura_dots'], altura_dots=dims['altura_dots'], gap_dots=dims['gap_dots'])


def gerar_pplb_a_pac_gran(rotulo, farmacia, dims=None):
    """Layout A.PAC.GRAN (76x25mm = 607x200 dots) - 3 campos: paciente, req, médico"""
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
    ], largura_dots=dims['largura_dots'], altura_dots=dims['altura_dots'], gap_dots=dims['gap_dots'])


def gerar_pplb_tirz(rotulo, farmacia, dims=None):
    """Layout TIRZ (Tirzepatida)"""
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
    ], largura_dots=dims['largura_dots'], altura_dots=dims['altura_dots'], gap_dots=dims['gap_dots'])


# ============================================
# HELPERS
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


# Mapa de geradores
GERADORES_PPLB = {
    'AMP_CX': gerar_pplb_ampcx,
    'AMP10': gerar_pplb_amp10,
    'A_PAC_PEQ': gerar_pplb_a_pac_peq,
    'A_PAC_GRAN': gerar_pplb_a_pac_gran,
    'TIRZ': gerar_pplb_tirz,
}


def enviar_para_impressora(nome_impressora, comandos_pplb):
    """Envia comandos PPLB para a impressora via win32print."""
    if not PRINTING_AVAILABLE:
        return {"success": False, "error": "pywin32 não disponível"}
    try:
        hPrinter = win32print.OpenPrinter(nome_impressora)
        try:
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Etiqueta", None, "RAW"))
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
        return {"success": False, "error": str(e)}


# ============================================
# ENDPOINTS
# ============================================

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        "status": "online",
        "impressora_padrao": IMPRESSORA_PADRAO,
        "sistema": platform.system(),
        "impressao_disponivel": PRINTING_AVAILABLE,
    })


@app.route('/impressoras', methods=['GET'])
def listar_impressoras():
    if not PRINTING_AVAILABLE:
        return jsonify({"impressoras": [], "padrao": ""})
    try:
        printers = []
        for flags, descr, name, comment in win32print.EnumPrinters(
            win32print.PRINTER_ENUM_LOCAL | win32print.PRINTER_ENUM_CONNECTIONS
        ):
            printers.append(name)
        padrao = win32print.GetDefaultPrinter()
        return jsonify({"impressoras": printers, "padrao": padrao})
    except Exception as e:
        return jsonify({"impressoras": [], "padrao": "", "error": str(e)})


@app.route('/teste', methods=['POST'])
def teste_impressao():
    """Imprime etiqueta de teste PPLB com dimensões da impressora selecionada."""
    impressora = request.json.get('impressora', IMPRESSORA_PADRAO) if request.json else IMPRESSORA_PADRAO
    dims = get_printer_dims(impressora)

    comandos = pplb_label([
        pplb_text(1, 3, 1, 1, 30, 10, "*** TESTE ***"),
        pplb_text(1, 2, 1, 1, 80, 10, "PPLB OK"),
        pplb_text(1, 2, 1, 1, 120, 10, f"Imp: {impressora}"),
        pplb_text(1, 2, 1, 1, 155, 10, f"q{dims['largura_dots']} Q{dims['altura_dots']}"),
    ], largura_dots=dims['largura_dots'], altura_dots=dims['altura_dots'], gap_dots=dims['gap_dots'])

    resultado = enviar_para_impressora(impressora, comandos)
    if resultado["success"]:
        return jsonify({"success": True, "message": "Teste enviado com sucesso"})
    else:
        return jsonify({"success": False, "error": resultado["error"]}), 500


@app.route('/imprimir', methods=['POST'])
def imprimir():
    """Recebe JSON com dados dos rótulos e imprime via PPLB em um único job."""
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Nenhum dado recebido"}), 400

    impressora = data.get('impressora', '') or IMPRESSORA_PADRAO
    layout_tipo = data.get('layout_tipo', 'AMP_CX')
    farmacia = data.get('farmacia', {})
    rotulos = data.get('rotulos', [])

    if not rotulos:
        return jsonify({"success": False, "error": "Nenhum rótulo para imprimir"}), 400

    gerador = GERADORES_PPLB.get(layout_tipo, gerar_pplb_ampcx)
    dims = get_printer_dims(impressora)

    # Concatenar TODOS os comandos PPLB em uma única string
    comandos_todos = ""
    erros_geracao = []
    for rotulo in rotulos:
        try:
            comandos = gerador(rotulo, farmacia, dims)
            comandos_todos += comandos
            print(f"[AGENTE] Rótulo {rotulo.get('id', '?')} layout={layout_tipo} dims=q{dims['largura_dots']}/Q{dims['altura_dots']} adicionado ao batch")
        except Exception as e:
            erros_geracao.append(f"Rótulo {rotulo.get('id', '?')}: {str(e)}")

    if not comandos_todos:
        return jsonify({"success": False, "error": "Nenhum comando gerado", "erros": erros_geracao}), 500

    # DEBUG: Mostrar os comandos PPLB gerados
    print(f"\n{'='*60}")
    print(f"[DEBUG PPLB] Comandos completos ({len(comandos_todos)} bytes):")
    print(f"{'='*60}")
    for i, line in enumerate(comandos_todos.split('\r\n')):
        display = line.replace('\x02', '<STX>')
        print(f"  [{i:02d}] {display}")
    print(f"{'='*60}\n")

    # Enviar TUDO em um único job de impressão
    print(f"[AGENTE] Enviando batch de {len(rotulos)} rótulos para '{impressora}' (q{dims['largura_dots']}/Q{dims['altura_dots']})")
    resultado = enviar_para_impressora(impressora, comandos_todos)

    if resultado["success"]:
        return jsonify({"success": True, "impressos": len(rotulos) - len(erros_geracao), "erros": erros_geracao if erros_geracao else None})
    else:
        return jsonify({"success": False, "error": resultado["error"], "erros": erros_geracao}), 500


if __name__ == '__main__':
    print("=" * 50)
    print("Agente de Impressão PPLB - ProPharmacos")
    print(f"Porta: 5001")
    print(f"Impressora padrão: {IMPRESSORA_PADRAO}")
    print(f"Impressão disponível: {PRINTING_AVAILABLE}")
    print("Impressoras configuradas:")
    for k, v in PRINTER_CONFIGS.items():
        print(f"  {k}: q{v['largura_dots']} Q{v['altura_dots']},{v['gap_dots']} ({v['cols_max']} cols)")
    print(f"Teste: http://localhost:5001/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5001, debug=True, threaded=True)
