from flask import Flask, jsonify, request
from flask_cors import CORS
import fdb

app = Flask(__name__)
CORS(app)

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

# Debug: lista produtos de uma requisição com seus CDPROs
@app.route('/api/debug/produtos-requisicao/<nr_requisicao>', methods=['GET'])
def debug_produtos_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Lista todos os itens da FC12110 com CDPRO
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

# Debug: busca observações por CDPRO
@app.route('/api/debug/observacoes/<cdpro>', methods=['GET'])
def debug_observacoes(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT CDPRO, OBSER FROM FC03300 WHERE CDPRO = ?
        """, (cdpro,))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({"success": False, "error": "Produto não encontrado na FC03300"}), 404
        
        # BLOB para string
        obser = row[1]
        if obser:
            obser = obser.read().decode('latin-1') if hasattr(obser, 'read') else str(obser)
        
        return jsonify({
            "success": True,
            "cdpro": row[0],
            "observacoes": obser
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca observações de todos os produtos de uma requisição
@app.route('/api/debug/observacoes-requisicao/<nr_requisicao>', methods=['GET'])
def debug_observacoes_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Busca produtos da requisição com suas observações
        cursor.execute("""
            SELECT I.ITEMID, I.CDPRO, I.DESCR, I.TPCMP, O.OBSER
            FROM FC12110 I
            LEFT JOIN FC03300 O ON I.CDPRO = O.CDPRO
            WHERE I.NRRQU = ? AND I.CDFIL = ? AND I.TPCMP IN ('C', 'S')
            ORDER BY I.ITEMID
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
                "observacoes": obser
            })
        
        conn.close()
        return jsonify({"success": True, "produtos": produtos})
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
                   R.VOLUME, R.UNIVOL, M.NOMEMED
            FROM FC12100 R
            LEFT JOIN FC04000 M ON R.PFCRM = M.PFCRM AND R.NRCRM = M.NRCRM AND R.UFCRM = M.UFCRM
            WHERE R.NRRQU = ? AND R.CDFIL = ?
        """, (nr_requisicao, filial))
        
        row = cursor.fetchone()
        
        if not row:
            conn.close()
            return jsonify({"success": False, "error": "Requisição não encontrada"}), 404
        
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
            "observacoes": row[11] or "",
            "volume": str(row[12]) if row[12] else "",
            "unidadeVolume": row[13] or "",
        }
        
        # Busca produtos - TPCMP IN ('C', 'S')
        cursor.execute("""
            SELECT DESCR, QUANT, UNIDA, NRLOT
            FROM FC12110
            WHERE NRRQU = ? AND CDFIL = ? AND TPCMP IN ('C', 'S')
            ORDER BY ITEMID
        """, (nr_requisicao, filial))
        
        formulas = cursor.fetchall()
        conn.close()
        
        data = []
        for idx, formula in enumerate(formulas):
            rotulo = {
                **dados_base,
                "nrItem": str(idx + 1),
                "formula": formula[0] or "",
                "volume": str(formula[1]) if formula[1] else dados_base["volume"],
                "unidadeVolume": formula[2] or dados_base["unidadeVolume"],
                "lote": (formula[3] or "").strip(),
                "quantidade": str(int(formula[1])) if formula[1] else "",
            }
            data.append(rotulo)
        
        if not data:
            data = [{**dados_base, "nrItem": "1", "formula": "", "lote": "", "quantidade": ""}]
        
        return jsonify({"success": True, "data": data})
        
    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
