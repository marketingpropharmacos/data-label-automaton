"""
Agente de Impressão Local - ProPharmacos
Roda no PC conectado à impressora Argox OS-2140 (PPLA).
Recebe dados JSON do frontend e gera comandos PPLA internamente.

Porta: 5001
Instalação: pip install flask flask-cors pywin32
Execução: python agente_impressao.py
"""

from flask import Flask, jsonify, request
from flask_cors import CORS
import platform
import sys

# Importa win32print apenas no Windows
if platform.system() == 'Windows':
    try:
        import win32print
        PRINTING_AVAILABLE = True
    except ImportError:
        print("ERRO: pywin32 não instalado. Execute: pip install pywin32")
        PRINTING_AVAILABLE = False
else:
    PRINTING_AVAILABLE = False
    print("AVISO: Sistema não-Windows. Impressão desabilitada.")

app = Flask(__name__)
CORS(app)

# Impressora padrão (nome exato do Windows)
IMPRESSORA_PADRAO = "Argox OS-214v PPLA"


# ============================================
# GERAÇÃO DE COMANDOS PPLA
# ============================================

def gerar_ppla_ampcx(rotulo, farmacia):
    """
    Gera comandos PPLA para layout AMP_CX (76mm x 35mm).
    Argox OS-2140 @ 203dpi: 76mm = 608 dots, 35mm = 280 dots
    """
    paciente = (rotulo.get('nomePaciente', '') or '')[:35].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')

    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    prefixo_crm = rotulo.get('prefixoCRM', '')
    numero_crm = rotulo.get('numeroCRM', '')
    uf_crm = rotulo.get('ufCRM', '')
    crm_completo = f"{prefixo_crm}{numero_crm}/{uf_crm}".strip('/')

    composicao = rotulo.get('composicao', '') or rotulo.get('formula', '')
    composicao = (composicao or '')[:50].upper()

    ph = rotulo.get('ph', '')
    lote = rotulo.get('lote', '')
    fab = rotulo.get('dataFabricacao', '')
    val = rotulo.get('dataValidade', '')

    aplicacao = (rotulo.get('aplicacao', '') or '')[:30].upper()
    contem = (rotulo.get('contem', '') or '')[:30].upper()
    registro = rotulo.get('numeroRegistro', '')

    linha4_parts = []
    if ph:
        linha4_parts.append(f"pH:{ph}")
    if lote:
        linha4_parts.append(f"LT:{lote}")
    if fab:
        linha4_parts.append(f"F:{fab}")
    if val:
        linha4_parts.append(f"V:{val}")
    linha4 = " ".join(linha4_parts)

    comandos = [
        "N",
        "q608",
        "Q280,24",
        f'A20,15,0,2,1,1,N,"{paciente}"',
        f'A470,15,0,1,1,1,N,"REQ:{nr_req}-{nr_item}"',
        f'A20,45,0,1,1,1,N,"DR. {nome_medico[:25]} CRM {crm_completo}"',
        f'A20,75,0,2,1,1,N,"{composicao}"',
        f'A20,105,0,1,1,1,N,"{linha4}"',
        f'A20,135,0,1,1,1,N,"APLICACAO: {aplicacao}"',
        f'A20,165,0,1,1,1,N,"CONTEM: {contem}"',
        f'A20,195,0,1,1,1,N,"Reg: {registro}"',
        "P1",
    ]

    return "\r\n".join(comandos)


def gerar_ppla_amp10(rotulo, farmacia):
    """
    Gera comandos PPLA para layout AMP10 (76mm x 35mm).
    Similar ao AMP_CX mas com registro na linha 5.
    """
    paciente = (rotulo.get('nomePaciente', '') or '')[:35].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')

    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    prefixo_crm = rotulo.get('prefixoCRM', '')
    numero_crm = rotulo.get('numeroCRM', '')
    uf_crm = rotulo.get('ufCRM', '')
    crm_completo = f"{prefixo_crm}{numero_crm}/{uf_crm}".strip('/')

    composicao = rotulo.get('composicao', '') or rotulo.get('formula', '')
    composicao = (composicao or '')[:50].upper()

    ph = rotulo.get('ph', '')
    lote = rotulo.get('lote', '')
    fab = rotulo.get('dataFabricacao', '')
    val = rotulo.get('dataValidade', '')
    registro = rotulo.get('numeroRegistro', '')

    linha4_parts = []
    if ph:
        linha4_parts.append(f"pH:{ph}")
    if lote:
        linha4_parts.append(f"LT:{lote}")
    if fab:
        linha4_parts.append(f"F:{fab}")
    if val:
        linha4_parts.append(f"V:{val}")
    linha4 = " ".join(linha4_parts)

    comandos = [
        "N",
        "q608",
        "Q280,24",
        f'A20,15,0,2,1,1,N,"{paciente}"',
        f'A470,15,0,1,1,1,N,"REQ:{nr_req}-{nr_item}"',
        f'A20,45,0,1,1,1,N,"DR. {nome_medico[:25]} CRM {crm_completo}"',
        f'A20,75,0,2,1,1,N,"{composicao}"',
        f'A20,105,0,1,1,1,N,"{linha4}"',
        f'A20,135,0,1,1,1,N,"REG: {registro}  {composicao[:20]}"',
        f'A20,165,0,1,1,1,N,"APLICACAO: {(rotulo.get("aplicacao","") or "")[:30].upper()}"',
        f'A20,195,0,1,1,1,N,"CONTEM: {(rotulo.get("contem","") or "")[:30].upper()}"',
        "P1",
    ]

    return "\r\n".join(comandos)


def gerar_ppla_a_pac_peq(rotulo, farmacia):
    """
    Gera comandos PPLA para layout A.PAC.PEQ (mínimo, 3 linhas).
    """
    paciente = (rotulo.get('nomePaciente', '') or '')[:35].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')

    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    prefixo_crm = rotulo.get('prefixoCRM', '')
    numero_crm = rotulo.get('numeroCRM', '')
    uf_crm = rotulo.get('ufCRM', '')
    crm_completo = f"{prefixo_crm}{numero_crm}/{uf_crm}".strip('/')
    registro = rotulo.get('numeroRegistro', '')

    comandos = [
        "N",
        "q608",
        "Q200,24",
        f'A20,20,0,2,1,1,N,"{paciente}  REQ:{nr_req}-{nr_item}"',
        f'A20,60,0,1,1,1,N,"DR. {nome_medico[:30]} CRM {crm_completo}"',
        f'A20,100,0,1,1,1,N,"REG: {registro}"',
        "P1",
    ]

    return "\r\n".join(comandos)


def gerar_ppla_a_pac_gran(rotulo, farmacia):
    """
    Gera comandos PPLA para layout A.PAC.GRAN (compacto, 2 linhas).
    """
    paciente = (rotulo.get('nomePaciente', '') or '')[:35].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')

    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    prefixo_crm = rotulo.get('prefixoCRM', '')
    numero_crm = rotulo.get('numeroCRM', '')
    uf_crm = rotulo.get('ufCRM', '')
    crm_completo = f"{prefixo_crm}{numero_crm}/{uf_crm}".strip('/')
    registro = rotulo.get('numeroRegistro', '')

    comandos = [
        "N",
        "q608",
        "Q160,24",
        f'A20,20,0,2,1,1,N,"{paciente}  REQ:{nr_req}-{nr_item}"',
        f'A20,60,0,1,1,1,N,"DR. {nome_medico[:25]} CRM {crm_completo}  REG:{registro}"',
        "P1",
    ]

    return "\r\n".join(comandos)


def gerar_ppla_tirz(rotulo, farmacia):
    """
    Gera comandos PPLA para layout TIRZ (Tirzepatida) - 7 linhas.
    """
    paciente = (rotulo.get('nomePaciente', '') or '')[:35].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')

    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    prefixo_crm = rotulo.get('prefixoCRM', '')
    numero_crm = rotulo.get('numeroCRM', '')
    uf_crm = rotulo.get('ufCRM', '')
    crm_completo = f"{prefixo_crm}{numero_crm}/{uf_crm}".strip('/')

    composicao = rotulo.get('composicao', '') or rotulo.get('formula', '')
    composicao = (composicao or '')[:50].upper()
    posologia = (rotulo.get('posologia', '') or '')[:50].upper()

    ph = rotulo.get('ph', '')
    lote = rotulo.get('lote', '')
    fab = rotulo.get('dataFabricacao', '')
    val = rotulo.get('dataValidade', '')
    contem = (rotulo.get('contem', '') or '')[:30].upper()
    registro = rotulo.get('numeroRegistro', '')

    linha4_parts = []
    if ph:
        linha4_parts.append(f"pH:{ph}")
    if lote:
        linha4_parts.append(f"LT:{lote}")
    if fab:
        linha4_parts.append(f"F:{fab}")
    if val:
        linha4_parts.append(f"V:{val}")
    linha4 = " ".join(linha4_parts)

    comandos = [
        "N",
        "q608",
        "Q280,24",
        f'A20,15,0,2,1,1,N,"{paciente}"',
        f'A470,15,0,1,1,1,N,"REQ:{nr_req}-{nr_item}"',
        f'A20,45,0,1,1,1,N,"DR. {nome_medico[:25]} CRM {crm_completo}"',
        f'A20,75,0,2,1,1,N,"{composicao}"',
        f'A20,105,0,1,1,1,N,"{posologia}"',
        f'A20,135,0,1,1,1,N,"{linha4}"',
        f'A20,165,0,1,1,1,N,"APLICACAO: {(rotulo.get("aplicacao","") or "")[:30].upper()}"',
        f'A20,195,0,1,1,1,N,"CONTEM: {contem}  REG:{registro}"',
        "P1",
    ]

    return "\r\n".join(comandos)


# Mapa de geradores por layout
GERADORES_PPLA = {
    'AMP_CX': gerar_ppla_ampcx,
    'AMP10': gerar_ppla_amp10,
    'A_PAC_PEQ': gerar_ppla_a_pac_peq,
    'A_PAC_GRAN': gerar_ppla_a_pac_gran,
    'TIRZ': gerar_ppla_tirz,
}


def enviar_para_impressora(nome_impressora, comandos_ppla):
    """Envia comandos PPLA para a impressora via win32print."""
    if not PRINTING_AVAILABLE:
        return {"success": False, "error": "pywin32 não disponível"}

    try:
        hPrinter = win32print.OpenPrinter(nome_impressora)
        try:
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Etiqueta", None, "RAW"))
            try:
                win32print.StartPagePrinter(hPrinter)
                dados = comandos_ppla.encode('cp850', errors='replace')
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
    impressora = IMPRESSORA_PADRAO
    return jsonify({
        "status": "online",
        "impressora_padrao": impressora,
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
    """Imprime etiqueta de teste."""
    impressora = request.json.get('impressora', IMPRESSORA_PADRAO) if request.json else IMPRESSORA_PADRAO

    comandos = "\r\n".join([
        "N",
        "q608",
        "Q280,24",
        'A20,50,0,3,1,1,N,"*** TESTE DE IMPRESSAO ***"',
        'A20,100,0,2,1,1,N,"Argox OS-2140 - PPLA"',
        'A20,150,0,2,1,1,N,"Agente de Impressao OK!"',
        f'A20,200,0,1,1,1,N,"Impressora: {impressora}"',
        "P1",
    ])

    resultado = enviar_para_impressora(impressora, comandos)
    if resultado["success"]:
        return jsonify({"success": True, "message": "Teste enviado com sucesso"})
    else:
        return jsonify({"success": False, "error": resultado["error"]}), 500


@app.route('/imprimir', methods=['POST'])
def imprimir():
    """
    Recebe JSON com dados dos rótulos e imprime via PPLA.
    
    Payload esperado:
    {
        "impressora": "Nome da Impressora",
        "layout_tipo": "AMP_CX",
        "farmacia": {"nome": "...", "farmaceutico": "...", "crf": "..."},
        "rotulos": [ { ...dados do rótulo... }, ... ]
    }
    """
    data = request.get_json()
    if not data:
        return jsonify({"success": False, "error": "Nenhum dado recebido"}), 400

    impressora = data.get('impressora', '') or IMPRESSORA_PADRAO
    layout_tipo = data.get('layout_tipo', 'AMP_CX')
    farmacia = data.get('farmacia', {})
    rotulos = data.get('rotulos', [])

    if not rotulos:
        return jsonify({"success": False, "error": "Nenhum rótulo para imprimir"}), 400

    # Seleciona o gerador PPLA pelo layout
    gerador = GERADORES_PPLA.get(layout_tipo, gerar_ppla_ampcx)

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
    print("Agente de Impressão - ProPharmacos")
    print(f"Porta: 5001")
    print(f"Impressora padrão: {IMPRESSORA_PADRAO}")
    print(f"Impressão disponível: {PRINTING_AVAILABLE}")
    print(f"Teste: http://localhost:5001/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5001, debug=True, threaded=True)
