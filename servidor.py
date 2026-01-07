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

# Rota de diagnóstico: lista todas as tabelas
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

# Rota de diagnóstico: lista colunas de uma tabela
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

@app.route('/api/requisicao/<nr_requisicao>', methods=['GET'])
def buscar_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Busca dados base da FC12100
        cursor.execute("""
            SELECT NRRQU, CDFIL, NOMEPA, PFCRM, NRCRM, UFCRM,
                   DTCAD, DTVAL, NRREG, POSOL, TPUSO, OBSERFIC,
                   VOLUME, UNIVOL
            FROM FC12100
            WHERE NRRQU = ? AND CDFIL = ?
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
            "nomeMedico": "",
            "dataFabricacao": row[6].strftime('%d/%m/%Y') if row[6] else "",
            "dataValidade": row[7].strftime('%d/%m/%Y') if row[7] else "",
            "numeroRegistro": row[8] or "",
            "posologia": row[9] or "",
            "tipoUso": row[10] or "",
            "observacoes": row[11] or "",
            "volume": str(row[12]) if row[12] else "",
            "unidadeVolume": row[13] or "",
        }
        
        # Busca produtos da FC12110 (TPCMP = 'C' são os componentes principais)
        cursor.execute("""
            SELECT DESCR, QUANT, UNIDA, NRLOT
            FROM FC12110
            WHERE NRRQU = ? AND CDFIL = ? AND TPCMP = 'C'
            ORDER BY ITEMID
        """, (nr_requisicao, filial))
        
        formulas = cursor.fetchall()
        conn.close()
        
        print(f"Requisição {nr_requisicao} - Fórmulas encontradas: {len(formulas)}")
        for f in formulas:
            print(f"  - {f[0]} | {f[1]} {f[2]}")
        
        # Cria um rótulo para cada produto
        data = []
        for idx, formula in enumerate(formulas):
            rotulo = {
                **dados_base,
                "nrItem": str(idx + 1),
                "formula": formula[0] or "",
                "volume": str(formula[1]) if formula[1] else dados_base["volume"],
                "unidadeVolume": formula[2] or dados_base["unidadeVolume"],
                "lote": (formula[3] or "").strip(),
            }
            data.append(rotulo)
        
        # Se não houver produtos, retorna pelo menos um rótulo
        if not data:
            data = [{**dados_base, "nrItem": "1", "formula": ""}]
        
        return jsonify({"success": True, "data": data})
        
    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
