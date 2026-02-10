"""
Agente de Impressão Local - ProPharmacos
Protocolo: PPLB (compatível Argox OS-2140)
Porta: 5001
Instalação: pip install flask flask-cors pywin32
Execução: python agente_impressao.py
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


# ============================================
# PPLB TEXT HELPER
# ============================================
# Formato PPLB texto: 1RFWH[YYYYY][XXXXX]DATA
# R=rotação(1=0°,2=90°,3=180°,4=270°), F=fonte(0-4), W=mult larg, H=mult alt
# YYYYY=posição Y (5 dígitos), XXXXX=posição X (5 dígitos)

def pplb_text(rot, font, wmult, hmult, y, x, data):
    """Gera uma linha de texto PPLB."""
    return f"1{rot}{font}{wmult}{hmult}{y:05d}{x:05d}{data}"


def pplb_label(linhas, largura_dots=608, altura_dots=280, gap_dots=24):
    """
    Monta um label PPLB completo com dimensões explícitas.
    largura_dots = largura da etiqueta em dots
    altura_dots = altura da etiqueta em dots
    gap_dots = espaço entre etiquetas em dots
    """
    partes = [
        "\x02L",                        # STX + início do label
        "H10",                          # Heat setting
        "D11",                          # Density
        f"q{largura_dots}",             # Largura da etiqueta
        f"Q{altura_dots},{gap_dots}",   # Altura + gap
    ]
    partes.extend(linhas)
    partes.append("E")  # Fim / imprimir
    return "\r\n".join(partes) + "\r\n"


# ============================================
# GERAÇÃO DE COMANDOS PPLB POR LAYOUT
# ============================================
# Argox OS-2140 @ 203dpi: 76mm ≈ 608 dots, 35mm ≈ 280 dots

def gerar_pplb_ampcx(rotulo, farmacia):
    """Layout AMP_CX (4.3x1 pol = 873x203 dots) - 8 linhas, LPP=8"""
    paciente = (rotulo.get('nomePaciente', '') or '')[:17].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    composicao = _composicao(rotulo, 50)
    linha_meta = _linha_meta(rotulo)
    aplicacao = (rotulo.get('aplicacao', '') or '')[:30].upper()
    contem = (rotulo.get('contem', '') or '')[:30].upper()
    registro = rotulo.get('numeroRegistro', '')

    # 8 linhas em 203 dots de altura, ~25 dots por linha
    return pplb_label([
        pplb_text(1, 2, 1, 1, 5,   10, paciente),
        pplb_text(1, 2, 1, 1, 5,  450, f"REQ:{nr_req}-{nr_item}"),
        pplb_text(1, 2, 1, 1, 30,  10, f"DR. {nome_medico[:25]} CRM {crm}"),
        pplb_text(1, 2, 1, 1, 55,  10, composicao),
        pplb_text(1, 2, 1, 1, 80,  10, linha_meta),
        pplb_text(1, 2, 1, 1, 105, 10, f"APLICACAO: {aplicacao}"),
        pplb_text(1, 2, 1, 1, 130, 10, f"CONTEM: {contem}"),
        pplb_text(1, 2, 1, 1, 155, 10, f"Reg: {registro}"),
    ], largura_dots=873, altura_dots=203, gap_dots=24)


def gerar_pplb_amp10(rotulo, farmacia):
    """Layout AMP10 (3.5x1.5 pol = 711x305 dots) - 8 linhas, LPP=8"""
    paciente = (rotulo.get('nomePaciente', '') or '')[:17].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    composicao = _composicao(rotulo, 50)
    linha_meta = _linha_meta(rotulo)
    registro = rotulo.get('numeroRegistro', '')
    aplicacao = (rotulo.get('aplicacao', '') or '')[:30].upper()
    contem = (rotulo.get('contem', '') or '')[:30].upper()

    # 8 linhas em 305 dots de altura, ~38 dots por linha
    return pplb_label([
        pplb_text(1, 2, 1, 1, 5,   10, paciente),
        pplb_text(1, 2, 1, 1, 5,  400, f"REQ:{nr_req}-{nr_item}"),
        pplb_text(1, 2, 1, 1, 40,  10, f"DR. {nome_medico[:25]} CRM {crm}"),
        pplb_text(1, 2, 1, 1, 75,  10, composicao),
        pplb_text(1, 2, 1, 1, 110, 10, linha_meta),
        pplb_text(1, 2, 1, 1, 145, 10, f"REG: {registro}  {composicao[:20]}"),
        pplb_text(1, 2, 1, 1, 180, 10, f"APLICACAO: {aplicacao}"),
        pplb_text(1, 2, 1, 1, 215, 10, f"CONTEM: {contem}"),
    ], largura_dots=711, altura_dots=305, gap_dots=24)


def gerar_pplb_a_pac_peq(rotulo, farmacia):
    """Layout A.PAC.PEQ (1.39x1 pol = 282x203 dots) - 3 linhas"""
    paciente = (rotulo.get('nomePaciente', '') or '')[:20].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    registro = rotulo.get('numeroRegistro', '')

    # 3 linhas em 203 dots
    return pplb_label([
        pplb_text(1, 2, 1, 1, 10,  10, f"{paciente}"),
        pplb_text(1, 2, 1, 1, 50,  10, f"REQ:{nr_req}-{nr_item}"),
        pplb_text(1, 2, 1, 1, 90,  10, f"DR.{nome_medico[:15]}"),
        pplb_text(1, 2, 1, 1, 130, 10, f"CRM {crm}"),
        pplb_text(1, 2, 1, 1, 165, 10, f"REG:{registro}"),
    ], largura_dots=282, altura_dots=203, gap_dots=24)


def gerar_pplb_a_pac_gran(rotulo, farmacia):
    """Layout A.PAC.GRAN (1.39x1 pol = 282x203 dots) - 2 linhas compactas"""
    paciente = (rotulo.get('nomePaciente', '') or '')[:20].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    registro = rotulo.get('numeroRegistro', '')

    # 2 linhas em 203 dots
    return pplb_label([
        pplb_text(1, 2, 1, 1, 10,  10, f"{paciente}"),
        pplb_text(1, 2, 1, 1, 50,  10, f"REQ:{nr_req}-{nr_item}"),
        pplb_text(1, 2, 1, 1, 90,  10, f"DR.{nome_medico[:15]}"),
        pplb_text(1, 2, 1, 1, 130, 10, f"CRM {crm} REG:{registro}"),
    ], largura_dots=282, altura_dots=203, gap_dots=24)


def gerar_pplb_tirz(rotulo, farmacia):
    """Layout TIRZ (Tirzepatida) - usa mesmas dimensões do AMP.CX por enquanto (4.3x1 pol = 873x203 dots)"""
    paciente = (rotulo.get('nomePaciente', '') or '')[:17].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    crm = _crm_completo(rotulo)
    composicao = _composicao(rotulo, 50)
    posologia = (rotulo.get('posologia', '') or '')[:50].upper()
    linha_meta = _linha_meta(rotulo)
    aplicacao = (rotulo.get('aplicacao', '') or '')[:30].upper()
    contem = (rotulo.get('contem', '') or '')[:30].upper()
    registro = rotulo.get('numeroRegistro', '')

    return pplb_label([
        pplb_text(1, 2, 1, 1, 5,   10, paciente),
        pplb_text(1, 2, 1, 1, 5,  450, f"REQ:{nr_req}-{nr_item}"),
        pplb_text(1, 2, 1, 1, 30,  10, f"DR. {nome_medico[:25]} CRM {crm}"),
        pplb_text(1, 2, 1, 1, 55,  10, composicao),
        pplb_text(1, 2, 1, 1, 80,  10, posologia),
        pplb_text(1, 2, 1, 1, 105, 10, linha_meta),
        pplb_text(1, 2, 1, 1, 130, 10, f"APLICACAO: {aplicacao}"),
        pplb_text(1, 2, 1, 1, 155, 10, f"CONTEM: {contem}  REG:{registro}"),
    ], largura_dots=873, altura_dots=203, gap_dots=24)


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
    """Imprime etiqueta de teste PPLB."""
    impressora = request.json.get('impressora', IMPRESSORA_PADRAO) if request.json else IMPRESSORA_PADRAO

    comandos = pplb_label([
        pplb_text(1, 3, 1, 1, 30, 10, "*** TESTE DE IMPRESSAO ***"),
        pplb_text(1, 2, 1, 1, 80, 10, "Argox OS-2140 - PPLB"),
        pplb_text(1, 2, 1, 1, 120, 10, "Agente de Impressao OK!"),
        pplb_text(1, 2, 1, 1, 160, 10, f"Impressora: {impressora}"),
    ], largura_dots=873, altura_dots=203, gap_dots=24)

    resultado = enviar_para_impressora(impressora, comandos)
    if resultado["success"]:
        return jsonify({"success": True, "message": "Teste enviado com sucesso"})
    else:
        return jsonify({"success": False, "error": resultado["error"]}), 500


@app.route('/imprimir', methods=['POST'])
def imprimir():
    """Recebe JSON com dados dos rótulos e imprime via PPLB."""
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
    impressos = 0
    erros = []

    for rotulo in rotulos:
        try:
            comandos = gerador(rotulo, farmacia)
            print(f"[AGENTE] Imprimindo rótulo {rotulo.get('id', '?')} layout={layout_tipo} impressora={impressora}")
            resultado = enviar_para_impressora(impressora, comandos)
            if resultado["success"]:
                impressos += 1
            else:
                erros.append(f"Rótulo {rotulo.get('id', '?')}: {resultado['error']}")
        except Exception as e:
            erros.append(f"Rótulo {rotulo.get('id', '?')}: {str(e)}")

    if impressos == len(rotulos):
        return jsonify({"success": True, "impressos": impressos})
    elif impressos > 0:
        return jsonify({"success": True, "impressos": impressos, "erros": erros})
    else:
        return jsonify({"success": False, "error": "Nenhum rótulo impresso", "erros": erros}), 500


if __name__ == '__main__':
    print("=" * 50)
    print("Agente de Impressão PPLB - ProPharmacos")
    print(f"Porta: 5001")
    print(f"Impressora padrão: {IMPRESSORA_PADRAO}")
    print(f"Impressão disponível: {PRINTING_AVAILABLE}")
    print(f"Teste: http://localhost:5001/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5001, debug=True, threaded=True)
