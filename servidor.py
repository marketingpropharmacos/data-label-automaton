from flask import Flask, jsonify, request, Response
from flask_cors import CORS
import fdb
import sys

# Força output imediato
sys.stdout.flush()

app = Flask(__name__)
CORS(app)

# Desabilita buffering
app.config['SEND_FILE_MAX_AGE_DEFAULT'] = 0

DB_PATH = '192.168.6.46/3050:C:\\Fcerta\\DB\\ALTERDB.IB'
DB_USER = 'SYSDBA'
DB_PASSWORD = 'masterkey'

def get_db_connection():
    return fdb.connect(
        dsn=DB_PATH,
        user=DB_USER,
        password=DB_PASSWORD,
        charset='WIN1252'
    )

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({"status": "ok"})

# Teste ULTRA simples - texto puro, sem JSON
@app.route('/api/ping', methods=['GET'])
def ping():
    return Response("pong", mimetype='text/plain')

@app.route('/api/tabelas', methods=['GET'])
def listar_tabelas():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "tabelas": tabelas})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/colunas/<tabela>', methods=['GET'])
def listar_colunas(tabela):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
            FROM RDB$RELATION_FIELDS RF
            JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
            WHERE RF.RDB$RELATION_NAME = ?
            ORDER BY RF.RDB$FIELD_POSITION
        """, (tabela.upper(),))
        colunas = [{
            "nome": row[0].strip(),
            "tipo": row[1],
            "tamanho": row[2]
        } for row in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "tabela": tabela, "colunas": colunas})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca tabelas relacionadas a observações
@app.route('/api/debug/tabelas-obs', methods=['GET'])
def debug_tabelas_obs():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0 
            AND (RDB$RELATION_NAME LIKE '%OBS%' 
                 OR RDB$RELATION_NAME LIKE '%FIC%'
                 OR RDB$RELATION_NAME LIKE '%033%'
                 OR RDB$RELATION_NAME LIKE '%ROT%')
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        conn.close()
        return jsonify({"success": True, "tabelas": tabelas})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca observações de ficha na FC03310 (tabela correta)
@app.route('/api/debug/obs-ficha/<cdpro>', methods=['GET'])
def debug_obs_ficha(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultados = {}
        
        # Tenta FC03310 - possível tabela de observações de ficha
        try:
            cursor.execute("""
                SELECT * FROM FC03310 WHERE CDPRO = ? ORDER BY 1, 2, 3
            """, (cdpro,))
            colunas = [desc[0].strip() for desc in cursor.description]
            registros = []
            for row in cursor.fetchall():
                registro = {}
                for i, col in enumerate(colunas):
                    val = row[i]
                    if hasattr(val, 'read'):
                        val = val.read().decode('latin-1')
                    elif hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    registro[col] = str(val) if val is not None else None
                registros.append(registro)
            resultados["FC03310"] = {"colunas": colunas, "registros": registros}
        except Exception as e:
            resultados["FC03310"] = {"erro": str(e)}
        
        # Tenta FC03320
        try:
            cursor.execute("""
                SELECT * FROM FC03320 WHERE CDPRO = ? ORDER BY 1, 2, 3
            """, (cdpro,))
            colunas = [desc[0].strip() for desc in cursor.description]
            registros = []
            for row in cursor.fetchall():
                registro = {}
                for i, col in enumerate(colunas):
                    val = row[i]
                    if hasattr(val, 'read'):
                        val = val.read().decode('latin-1')
                    elif hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    registro[col] = str(val) if val is not None else None
                registros.append(registro)
            resultados["FC03320"] = {"colunas": colunas, "registros": registros}
        except Exception as e:
            resultados["FC03320"] = {"erro": str(e)}
        
        # Busca tabela FC06300 - observações de ficha
        try:
            cursor.execute("""
                SELECT * FROM FC06300 WHERE CDPRO = ? ORDER BY 1, 2, 3
            """, (cdpro,))
            colunas = [desc[0].strip() for desc in cursor.description]
            registros = []
            for row in cursor.fetchall():
                registro = {}
                for i, col in enumerate(colunas):
                    val = row[i]
                    if hasattr(val, 'read'):
                        val = val.read().decode('latin-1')
                    elif hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    registro[col] = str(val) if val is not None else None
                registros.append(registro)
            resultados["FC06300"] = {"colunas": colunas, "registros": registros}
        except Exception as e:
            resultados["FC06300"] = {"erro": str(e)}
        
        conn.close()
        return jsonify({
            "success": True,
            "cdpro": cdpro,
            "resultados": resultados
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: teste simples SEM banco - resposta instantânea
@app.route('/api/debug/buscar-texto', methods=['GET'])
def debug_buscar_texto():
    texto = request.args.get('texto', '')
    if not texto:
        return jsonify({"success": False, "error": "Parâmetro 'texto' é obrigatório"}), 400
    
    # Retorna dados fake INSTANTANEAMENTE (sem acessar banco)
    return jsonify({
        "success": True,
        "texto": texto,
        "mensagem": "Endpoint funcionando! Este é um teste sem banco de dados.",
        "total": 1,
        "encontrados": [
            {"tabela": "TESTE", "cdpro": "123", "descricao": f"Teste para: {texto}"}
        ]
    })

# Debug: lista todas colunas da FC03300
@app.route('/api/debug/estrutura-fc03300', methods=['GET'])
def debug_estrutura_fc03300():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Lista todas as colunas
        cursor.execute("""
            SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
            FROM RDB$RELATION_FIELDS RF
            JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
            WHERE RF.RDB$RELATION_NAME = 'FC03300'
            ORDER BY RF.RDB$FIELD_POSITION
        """)
        colunas = [{
            "nome": row[0].strip(),
            "tipo": row[1],
            "tamanho": row[2]
        } for row in cursor.fetchall()]
        
        # Busca um registro de exemplo
        cursor.execute("SELECT FIRST 1 * FROM FC03300 WHERE CDPRO = 3348")
        exemplo = None
        if cursor.description:
            cols = [desc[0].strip() for desc in cursor.description]
            row = cursor.fetchone()
            if row:
                exemplo = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'read'):
                        val = val.read().decode('latin-1')[:100]
                    exemplo[col] = str(val) if val is not None else None
        
        conn.close()
        return jsonify({
            "success": True,
            "colunas": colunas,
            "exemplo": exemplo
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: lista últimas requisições
@app.route('/api/debug/ultimas-requisicoes', methods=['GET'])
def debug_ultimas_requisicoes():
    limite = request.args.get('limite', '20')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
            SELECT FIRST {limite} NRRQU, CDFIL, NOMEPA, DTCAD, TPFORMAFARMA
            FROM FC12100
            ORDER BY NRRQU DESC
        """)
        requisicoes = []
        for row in cursor.fetchall():
            requisicoes.append({
                "nrRequisicao": str(row[0]),
                "filial": str(row[1]),
                "paciente": row[2],
                "dataCad": row[3].strftime('%d/%m/%Y') if row[3] else None,
                "tipoFormaFarma": row[4]
            })
        conn.close()
        return jsonify({"success": True, "requisicoes": requisicoes})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: lista produtos que têm observações cadastradas
@app.route('/api/debug/produtos-com-observacoes', methods=['GET'])
def debug_produtos_com_observacoes():
    limite = request.args.get('limite', '20')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute(f"""
            SELECT FIRST {limite} O.CDPRO, O.TPFORMAFARMA, O.CDICP, O.GRICP, P.DESCR, O.OBSER 
            FROM FC03300 O
            LEFT JOIN FC03000 P ON O.CDPRO = P.CDPRO
            WHERE O.OBSER IS NOT NULL
            ORDER BY O.CDPRO, O.GRICP, O.CDICP
        """)
        produtos = []
        for row in cursor.fetchall():
            obser = row[5]
            if obser:
                obser = obser.read().decode('latin-1') if hasattr(obser, 'read') else str(obser)
            if obser and obser.strip():
                produtos.append({
                    "cdpro": row[0],
                    "tipoFormaFarma": row[1],
                    "codigoObs": row[2],
                    "gricp": row[3],
                    "descricao": row[4],
                    "observacoes": obser[:300] if obser else None
                })
        conn.close()
        return jsonify({"success": True, "total": len(produtos), "produtos": produtos})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/debug/formulas/<nr_requisicao>', methods=['GET'])
def debug_formulas(nr_requisicao):
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM FC12100
            WHERE NRRQU = ? AND CDFIL = ?
        """, (nr_requisicao, filial))
        colunas = [desc[0].strip() for desc in cursor.description]
        registros = []
        for row in cursor.fetchall():
            registro = {}
            for i, col in enumerate(colunas):
                val = row[i]
                if hasattr(val, 'strftime'):
                    val = val.strftime('%d/%m/%Y')
                registro[col] = str(val) if val is not None else None
            registros.append(registro)
        conn.close()
        return jsonify({
            "success": True,
            "colunas": colunas,
            "total_registros": len(registros),
            "registros": registros
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/debug/produtos-requisicao/<nr_requisicao>', methods=['GET'])
def debug_produtos_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT ITEMID, CDPRO, DESCR, QUANT, UNIDA, TPCMP
            FROM FC12110
            WHERE NRRQU = ? AND CDFIL = ?
            ORDER BY ITEMID
        """, (nr_requisicao, filial))
        produtos = []
        for row in cursor.fetchall():
            produtos.append({
                "itemId": row[0],
                "cdpro": row[1],
                "descricao": row[2],
                "quantidade": str(row[3]) if row[3] else None,
                "unidade": row[4],
                "tipoCmp": row[5]
            })
        conn.close()
        return jsonify({"success": True, "produtos": produtos})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: observações por CDPRO - COM GRICP
@app.route('/api/debug/observacoes/<cdpro>', methods=['GET'])
def debug_observacoes(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT CDPRO, TPFORMAFARMA, CDICP, GRICP, OBSER 
            FROM FC03300 
            WHERE CDPRO = ?
            ORDER BY GRICP, CDICP
        """, (cdpro,))
        
        observacoes = []
        for row in cursor.fetchall():
            obser = row[4]
            if obser:
                obser = obser.read().decode('latin-1') if hasattr(obser, 'read') else str(obser)
            observacoes.append({
                "cdpro": row[0],
                "tipoFormaFarma": row[1],
                "codigoObs": row[2],
                "gricp": row[3],
                "observacoes": obser
            })
        
        conn.close()
        
        if not observacoes:
            return jsonify({"success": False, "error": "Produto não encontrado na FC03300"}), 404
        
        return jsonify({
            "success": True,
            "cdpro": cdpro,
            "totalObservacoes": len(observacoes),
            "observacoes": observacoes
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/debug/observacoes-requisicao/<nr_requisicao>', methods=['GET'])
def debug_observacoes_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Busca o TPFORMAFARMA da requisição
        cursor.execute("""
            SELECT TPFORMAFARMA FROM FC12100
            WHERE NRRQU = ? AND CDFIL = ?
        """, (nr_requisicao, filial))
        req_row = cursor.fetchone()
        tipo_forma = req_row[0] if req_row else None
        
        # Busca produtos com observações
        cursor.execute("""
            SELECT I.ITEMID, I.CDPRO, I.DESCR, I.TPCMP, O.OBSER, O.GRICP, O.CDICP
            FROM FC12110 I
            LEFT JOIN FC03300 O ON I.CDPRO = O.CDPRO
            WHERE I.NRRQU = ? AND I.CDFIL = ? AND I.TPCMP IN ('C', 'S')
            ORDER BY I.ITEMID, O.GRICP, O.CDICP
        """, (nr_requisicao, filial))
        
        produtos = []
        for row in cursor.fetchall():
            obser = row[4]
            if obser:
                obser = obser.read().decode('latin-1') if hasattr(obser, 'read') else str(obser)
            
            produtos.append({
                "itemId": row[0],
                "cdpro": row[1],
                "descricao": row[2],
                "tipoCmp": row[3],
                "observacoes": obser,
                "gricp": row[5],
                "codigoObs": row[6]
            })
        
        conn.close()
        return jsonify({
            "success": True, 
            "tipoFormaFarmaRequisicao": tipo_forma,
            "produtos": produtos
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/requisicao/<nr_requisicao>', methods=['GET'])
def buscar_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT R.NRRQU, R.CDFIL, R.NOMEPA, R.PFCRM, R.NRCRM, R.UFCRM,
                   R.DTCAD, R.DTVAL, R.NRREG, R.POSOL, R.TPUSO, R.OBSERFIC,
                   R.VOLUME, R.UNIVOL, M.NOMEMED, R.TPFORMAFARMA
            FROM FC12100 R
            LEFT JOIN FC04000 M ON R.PFCRM = M.PFCRM AND R.NRCRM = M.NRCRM AND R.UFCRM = M.UFCRM
            WHERE R.NRRQU = ? AND R.CDFIL = ?
        """, (nr_requisicao, filial))
        
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({"success": False, "error": "Requisição não encontrada"}), 404
        
        tipo_forma = row[15]
        
        dados_base = {
            "nrRequisicao": str(row[0]),
            "codigoFilial": str(row[1]),
            "nomePaciente": row[2] or "",
            "prefixoCRM": row[3] or "",
            "numeroCRM": row[4] or "",
            "ufCRM": row[5] or "",
            "nomeMedico": row[14] or "",
            "dataFabricacao": row[6].strftime('%d/%m/%Y') if row[6] else "",
            "dataValidade": row[7].strftime('%d/%m/%Y') if row[7] else "",
            "numeroRegistro": row[8] or "",
            "posologia": row[9] or "",
            "tipoUso": row[10] or "",
            "observacoesFicha": row[11] or "",
            "volume": str(row[12]) if row[12] else "",
            "unidadeVolume": row[13] or "",
        }
        
        # Busca produtos COM observações
        cursor.execute("""
            SELECT I.DESCR, I.QUANT, I.UNIDA, I.NRLOT, I.CDPRO, O.OBSER, O.GRICP
            FROM FC12110 I
            LEFT JOIN FC03300 O ON I.CDPRO = O.CDPRO
            WHERE I.NRRQU = ? AND I.CDFIL = ? AND I.TPCMP IN ('C', 'S')
            ORDER BY I.ITEMID
        """, (nr_requisicao, filial))
        
        formulas = cursor.fetchall()
        conn.close()
        
        data = []
        for idx, formula in enumerate(formulas):
            obser = formula[5]
            if obser:
                obser = obser.read().decode('latin-1') if hasattr(obser, 'read') else str(obser)
            
            rotulo = {
                **dados_base,
                "nrItem": str(idx + 1),
                "formula": formula[0] or "",
                "volume": str(formula[1]) if formula[1] else dados_base["volume"],
                "unidadeVolume": formula[2] or dados_base["unidadeVolume"],
                "lote": (formula[3] or "").strip(),
                "quantidade": str(int(formula[1])) if formula[1] else "",
                "observacoes": obser or "",
            }
            data.append(rotulo)
        
        if not data:
            data = [{**dados_base, "nrItem": "1", "formula": "", "lote": "", "quantidade": "", "observacoes": ""}]
        
        return jsonify({"success": True, "data": data})
        
    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    print("Servidor iniciando na porta 5000...")
    print("Acesse: http://localhost:5000/api/health")
    sys.stdout.flush()
    # threaded=True permite múltiplas conexões simultâneas
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
