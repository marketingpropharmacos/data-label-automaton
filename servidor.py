from flask import Flask, jsonify, request
from flask_cors import CORS
import fdb
import platform

# Importa win32print apenas no Windows
if platform.system() == 'Windows':
    try:
        import win32print
        import win32ui
        PRINTING_AVAILABLE = True
    except ImportError:
        print("AVISO: pywin32 não instalado. Execute: pip install pywin32")
        PRINTING_AVAILABLE = False
else:
    PRINTING_AVAILABLE = False
    print("AVISO: Sistema não-Windows detectado. Impressão desabilitada.")

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

# Debug: busca observações de ficha em tabelas alternativas
@app.route('/api/debug/obs-ficha/<cdpro>', methods=['GET'])
def debug_obs_ficha(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultados = {}
        
        # Tenta FC03310
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
        
        # Tenta FC06300
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

# Debug: busca texto específico em TODAS tabelas (corrigido)
@app.route('/api/debug/buscar-texto', methods=['GET'])
def debug_buscar_texto():
    texto = request.args.get('texto', '')
    if not texto:
        return jsonify({"success": False, "error": "Parâmetro 'texto' é obrigatório"}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Lista todas as tabelas do usuário
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        
        encontrados = []
        erros = []
        
        for tabela in tabelas:
            try:
                # Busca colunas VARCHAR (tipo 37) ou BLOB (tipo 261)
                cursor.execute("""
                    SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
                    FROM RDB$RELATION_FIELDS RF
                    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                    WHERE RF.RDB$RELATION_NAME = ?
                    AND (F.RDB$FIELD_TYPE = 261 OR (F.RDB$FIELD_TYPE = 37 AND F.RDB$FIELD_LENGTH > 20))
                """, (tabela,))
                
                colunas_info = [(row[0].strip(), row[1]) for row in cursor.fetchall()]
                
                for coluna, tipo in colunas_info:
                    try:
                        # Para VARCHAR usa LIKE direto, para BLOB precisa de CAST
                        if tipo == 37:  # VARCHAR
                            sql = f"SELECT FIRST 3 * FROM {tabela} WHERE UPPER({coluna}) LIKE UPPER('%{texto}%')"
                        else:  # BLOB
                            sql = f"SELECT FIRST 3 * FROM {tabela} WHERE UPPER(CAST({coluna} AS VARCHAR(2000))) LIKE UPPER('%{texto}%')"
                        
                        cursor.execute(sql)
                        rows = cursor.fetchall()
                        
                        if rows:
                            cols = [desc[0].strip() for desc in cursor.description]
                            for row in rows:
                                registro = {}
                                for i, col in enumerate(cols):
                                    val = row[i]
                                    if hasattr(val, 'read'):
                                        try:
                                            val = val.read().decode('latin-1')[:300]
                                        except:
                                            val = "[BLOB]"
                                    elif hasattr(val, 'strftime'):
                                        val = val.strftime('%d/%m/%Y')
                                    elif val is not None:
                                        val = str(val)[:300]
                                    registro[col] = val
                                encontrados.append({
                                    "tabela": tabela,
                                    "coluna": coluna,
                                    "tipo": "BLOB" if tipo == 261 else "VARCHAR",
                                    "registro": registro
                                })
                    except Exception as e:
                        pass  # Ignora erros de colunas individuais
            except Exception as e:
                erros.append(f"{tabela}: {str(e)}")
        
        conn.close()
        return jsonify({
            "success": True,
            "texto": texto,
            "totalTabelas": len(tabelas),
            "totalEncontrados": len(encontrados),
            "encontrados": encontrados,
            "erros": erros if erros else None
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: estrutura completa da FC03300
@app.route('/api/debug/estrutura-fc03300', methods=['GET'])
def debug_estrutura_fc03300():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
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

# Debug: lista produtos com observações
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

# Debug: observações por CDPRO com GRICP
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

# Debug: dados da FC99999 por CDPRO (OBSFIC)
@app.route('/api/debug/fc99999/<cdpro>', methods=['GET'])
def debug_fc99999(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        argumento_obsfic = f"OBSFIC{cdpro}"
        cursor.execute("""
            SELECT ARGUMENTO, SUBARGUM, PARAMETRO 
            FROM FC99999 
            WHERE ARGUMENTO = ?
            ORDER BY SUBARGUM
        """, (argumento_obsfic,))
        
        registros = []
        for row in cursor.fetchall():
            texto = row[2]
            if texto and hasattr(texto, 'read'):
                texto = texto.read().decode('latin-1')
            registros.append({
                "argumento": row[0],
                "subargum": row[1],
                "parametro": texto
            })
        
        conn.close()
        
        return jsonify({
            "success": True,
            "cdpro": cdpro,
            "argumento_buscado": argumento_obsfic,
            "total": len(registros),
            "registros": registros
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route('/api/debug/observacoes-requisicao/<nr_requisicao>', methods=['GET'])
def debug_observacoes_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT TPFORMAFARMA FROM FC12100
            WHERE NRRQU = ? AND CDFIL = ?
        """, (nr_requisicao, filial))
        req_row = cursor.fetchone()
        tipo_forma = req_row[0] if req_row else None
        
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

# Debug: verifica observações de produtos de uma requisição com detalhes
@app.route('/api/debug/verificar-obs-requisicao/<nr_requisicao>', methods=['GET'])
def debug_verificar_obs_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Busca TPFORMAFARMA da requisição
        cursor.execute("""
            SELECT TPFORMAFARMA FROM FC12100
            WHERE NRRQU = ? AND CDFIL = ?
        """, (nr_requisicao, filial))
        req_row = cursor.fetchone()
        tipo_forma_requisicao = req_row[0] if req_row else None
        
        # Busca produtos da requisição
        cursor.execute("""
            SELECT I.ITEMID, I.CDPRO, I.DESCR
            FROM FC12110 I
            WHERE I.NRRQU = ? AND I.CDFIL = ? AND I.TPCMP IN ('C', 'S')
            ORDER BY I.ITEMID
        """, (nr_requisicao, filial))
        
        itens = cursor.fetchall()
        
        resultado = {
            "tipoFormaFarmaRequisicao": tipo_forma_requisicao,
            "produtos": []
        }
        
        for item in itens:
            cdpro = item[1]
            
            # Busca TODAS as observações deste produto (sem filtro de TPFORMAFARMA)
            cursor.execute("""
                SELECT TPFORMAFARMA, CDICP, OBSER 
                FROM FC03300 
                WHERE CDPRO = ?
                ORDER BY TPFORMAFARMA, CDICP
            """, (cdpro,))
            
            obs_list = []
            for obs in cursor.fetchall():
                texto = obs[2]
                if texto and hasattr(texto, 'read'):
                    texto = texto.read().decode('latin-1')
                obs_list.append({
                    "tpFormaFarma": obs[0],
                    "cdicp": obs[1],
                    "texto": texto[:200] if texto else None
                })
            
            resultado["produtos"].append({
                "cdpro": cdpro,
                "descricao": item[2],
                "totalObservacoes": len(obs_list),
                "observacoes": obs_list
            })
        
        conn.close()
        return jsonify({"success": True, **resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# DEBUG: INVESTIGAÇÃO DE KITS E FÓRMULAS
# ============================================

# Debug: busca tabelas relacionadas a Fórmulas/Kits/Componentes
@app.route('/api/debug/tabelas-formula', methods=['GET'])
def debug_tabelas_formula():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Busca tabelas que possam conter fórmulas, kits ou componentes
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0 
            AND (RDB$RELATION_NAME LIKE '%FORM%' 
                 OR RDB$RELATION_NAME LIKE '%FRM%'
                 OR RDB$RELATION_NAME LIKE '%KIT%'
                 OR RDB$RELATION_NAME LIKE '%COMP%'
                 OR RDB$RELATION_NAME LIKE '%ITEM%'
                 OR RDB$RELATION_NAME LIKE '%037%'
                 OR RDB$RELATION_NAME LIKE '%038%'
                 OR RDB$RELATION_NAME LIKE '%039%')
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        
        # Lista estrutura de cada tabela encontrada
        resultado = []
        for tabela in tabelas:
            cursor.execute("""
                SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
                FROM RDB$RELATION_FIELDS RF
                JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                WHERE RF.RDB$RELATION_NAME = ?
                ORDER BY RF.RDB$FIELD_POSITION
            """, (tabela,))
            colunas = [{
                "nome": row[0].strip(),
                "tipo": row[1],
                "tamanho": row[2]
            } for row in cursor.fetchall()]
            
            # Conta registros
            try:
                cursor.execute(f"SELECT COUNT(*) FROM {tabela}")
                total = cursor.fetchone()[0]
            except:
                total = "?"
            
            resultado.append({
                "tabela": tabela,
                "colunas": colunas,
                "totalRegistros": total
            })
        
        conn.close()
        return jsonify({"success": True, "tabelas": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca código de fórmula/kit em todas as tabelas
@app.route('/api/debug/buscar-formula/<codigo>', methods=['GET'])
def debug_buscar_formula(codigo):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Lista todas as tabelas
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        
        encontrados = []
        
        for tabela in tabelas:
            try:
                # Busca colunas numéricas ou varchar
                cursor.execute("""
                    SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE
                    FROM RDB$RELATION_FIELDS RF
                    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                    WHERE RF.RDB$RELATION_NAME = ?
                    AND (F.RDB$FIELD_TYPE IN (7, 8, 10, 14, 16, 27, 37))
                """, (tabela,))
                
                colunas = [(row[0].strip(), row[1]) for row in cursor.fetchall()]
                
                for coluna, tipo in colunas:
                    try:
                        # Tenta buscar o código
                        if tipo in (7, 8, 10, 14, 16, 27):  # Numéricos
                            sql = f"SELECT FIRST 5 * FROM {tabela} WHERE {coluna} = {codigo}"
                        else:  # VARCHAR
                            sql = f"SELECT FIRST 5 * FROM {tabela} WHERE {coluna} = '{codigo}'"
                        
                        cursor.execute(sql)
                        rows = cursor.fetchall()
                        
                        if rows:
                            cols = [desc[0].strip() for desc in cursor.description]
                            for row in rows:
                                registro = {}
                                for i, col in enumerate(cols):
                                    val = row[i]
                                    if hasattr(val, 'read'):
                                        try:
                                            val = val.read().decode('latin-1')[:200]
                                        except:
                                            val = "[BLOB]"
                                    elif hasattr(val, 'strftime'):
                                        val = val.strftime('%d/%m/%Y')
                                    elif val is not None:
                                        val = str(val)[:200]
                                    registro[col] = val
                                encontrados.append({
                                    "tabela": tabela,
                                    "colunaEncontrada": coluna,
                                    "registro": registro
                                })
                    except:
                        pass
            except:
                pass
        
        conn.close()
        return jsonify({
            "success": True,
            "codigo": codigo,
            "totalEncontrados": len(encontrados),
            "encontrados": encontrados
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: estrutura completa das tabelas FC03xxx (produtos e observações)
@app.route('/api/debug/estrutura-tabelas-produto', methods=['GET'])
def debug_estrutura_tabelas_produto():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        tabelas = ['FC03000', 'FC03100', 'FC03200', 'FC03300', 'FC03310', 'FC03320', 'FC03900']
        resultado = {}
        
        for tabela in tabelas:
            try:
                cursor.execute("""
                    SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
                    FROM RDB$RELATION_FIELDS RF
                    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                    WHERE RF.RDB$RELATION_NAME = ?
                    ORDER BY RF.RDB$FIELD_POSITION
                """, (tabela,))
                colunas = [{
                    "nome": row[0].strip(),
                    "tipo": row[1],
                    "tamanho": row[2]
                } for row in cursor.fetchall()]
                
                # Conta registros
                cursor.execute(f"SELECT COUNT(*) FROM {tabela}")
                total = cursor.fetchone()[0]
                
                resultado[tabela] = {
                    "colunas": colunas,
                    "totalRegistros": total
                }
            except Exception as e:
                resultado[tabela] = {"erro": str(e)}
        
        conn.close()
        return jsonify({"success": True, "tabelas": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca lotes e datas de um produto
@app.route('/api/debug/lotes-produto/<cdpro>', methods=['GET'])
def debug_lotes_produto(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {}
        
        # Tabelas que podem conter lotes/datas
        tabelas_lote = ['FC06100', 'FC06200', 'FC06300', 'FC07100', 'FC07200', 'FC12110']
        
        for tabela in tabelas_lote:
            try:
                # Verifica se tabela tem CDPRO ou similar
                cursor.execute("""
                    SELECT RF.RDB$FIELD_NAME
                    FROM RDB$RELATION_FIELDS RF
                    WHERE RF.RDB$RELATION_NAME = ?
                    AND (RF.RDB$FIELD_NAME LIKE '%CDPRO%' 
                         OR RF.RDB$FIELD_NAME LIKE '%PRO%'
                         OR RF.RDB$FIELD_NAME LIKE '%COD%')
                """, (tabela,))
                colunas_busca = [row[0].strip() for row in cursor.fetchall()]
                
                for col in colunas_busca:
                    try:
                        cursor.execute(f"SELECT FIRST 10 * FROM {tabela} WHERE {col} = ?", (cdpro,))
                        rows = cursor.fetchall()
                        
                        if rows:
                            cols = [desc[0].strip() for desc in cursor.description]
                            registros = []
                            for row in rows:
                                registro = {}
                                for i, c in enumerate(cols):
                                    val = row[i]
                                    if hasattr(val, 'strftime'):
                                        val = val.strftime('%d/%m/%Y')
                                    elif hasattr(val, 'read'):
                                        val = "[BLOB]"
                                    elif val is not None:
                                        val = str(val)[:100]
                                    registro[c] = val
                                registros.append(registro)
                            resultado[f"{tabela}.{col}"] = {
                                "colunas": cols,
                                "registros": registros
                            }
                    except:
                        pass
            except:
                pass
        
        conn.close()
        return jsonify({
            "success": True,
            "cdpro": cdpro,
            "tabelasAnalisadas": tabelas_lote,
            "encontrados": resultado
        })
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca observações com código 94 (Observação Ficha descoberto pelo usuário)
@app.route('/api/debug/obs-ficha-94', methods=['GET'])
def debug_obs_ficha_94():
    limite = request.args.get('limite', '50')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {}
        
        # Busca na FC03300 com GRICP = 94
        try:
            cursor.execute(f"""
                SELECT FIRST {limite} CDPRO, TPFORMAFARMA, CDICP, GRICP, OBSER 
                FROM FC03300 
                WHERE GRICP = 94
                ORDER BY CDPRO
            """)
            
            registros = []
            for row in cursor.fetchall():
                obser = row[4]
                if obser and hasattr(obser, 'read'):
                    obser = obser.read().decode('latin-1')
                registros.append({
                    "cdpro": row[0],
                    "tipoFormaFarma": row[1],
                    "cdicp": row[2],
                    "gricp": row[3],
                    "observacao": obser[:500] if obser else None
                })
            resultado["FC03300_GRICP_94"] = registros
        except Exception as e:
            resultado["FC03300_GRICP_94"] = {"erro": str(e)}
        
        # Busca na FC03900 (se existir)
        try:
            cursor.execute(f"""
                SELECT FIRST {limite} * FROM FC03900
                ORDER BY 1
            """)
            cols = [desc[0].strip() for desc in cursor.description]
            registros = []
            for row in cursor.fetchall():
                registro = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'read'):
                        try:
                            val = val.read().decode('latin-1')[:300]
                        except:
                            val = "[BLOB]"
                    elif hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif val is not None:
                        val = str(val)[:200]
                    registro[col] = val
                registros.append(registro)
            resultado["FC03900"] = {
                "colunas": cols,
                "registros": registros
            }
        except Exception as e:
            resultado["FC03900"] = {"erro": str(e)}
        
        conn.close()
        return jsonify({"success": True, "resultado": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca componentes de um kit/fórmula pelo código do produto
@app.route('/api/debug/componentes-kit/<cdpro>', methods=['GET'])
def debug_componentes_kit(cdpro):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {}
        
        # Primeiro, busca informações do produto
        cursor.execute("""
            SELECT CDPRO, DESCR, TPPRO, TPFORMAFARMA
            FROM FC03000
            WHERE CDPRO = ?
        """, (cdpro,))
        prod = cursor.fetchone()
        if prod:
            resultado["produto"] = {
                "cdpro": prod[0],
                "descricao": prod[1],
                "tipoProduto": prod[2],
                "tipoFormaFarma": prod[3]
            }
        
        # Busca em várias tabelas possíveis de componentes
        tabelas_comp = [
            ('FC03100', 'CDPRO'),
            ('FC03200', 'CDPRO'),
            ('FC03710', 'CDPRO'),
            ('FC03720', 'CDPRO'),
            ('FC03730', 'CDPRO'),
            ('FC12110', 'CDPRO'),
        ]
        
        for tabela, coluna in tabelas_comp:
            try:
                cursor.execute(f"SELECT FIRST 20 * FROM {tabela} WHERE {coluna} = ?", (cdpro,))
                rows = cursor.fetchall()
                
                if rows:
                    cols = [desc[0].strip() for desc in cursor.description]
                    registros = []
                    for row in rows:
                        registro = {}
                        for i, col in enumerate(cols):
                            val = row[i]
                            if hasattr(val, 'read'):
                                try:
                                    val = val.read().decode('latin-1')[:200]
                                except:
                                    val = "[BLOB]"
                            elif hasattr(val, 'strftime'):
                                val = val.strftime('%d/%m/%Y')
                            elif val is not None:
                                val = str(val)[:200]
                            registro[col] = val
                        registros.append(registro)
                    resultado[tabela] = {
                        "colunas": cols,
                        "registros": registros
                    }
            except Exception as e:
                resultado[tabela] = {"erro": str(e)}
        
        # Busca requisições que usaram este produto
        try:
            cursor.execute("""
                SELECT FIRST 5 NRRQU, CDFIL, ITEMID, DESCR, QUANT, TPCMP
                FROM FC12110
                WHERE CDPRO = ?
                ORDER BY NRRQU DESC
            """, (cdpro,))
            rows = cursor.fetchall()
            if rows:
                resultado["requisicoes_com_produto"] = [{
                    "nrRequisicao": row[0],
                    "filial": row[1],
                    "itemId": row[2],
                    "descricao": row[3],
                    "quantidade": str(row[4]) if row[4] else None,
                    "tipoCmp": row[5]
                } for row in rows]
        except Exception as e:
            resultado["requisicoes_com_produto"] = {"erro": str(e)}
        
        conn.close()
        return jsonify({"success": True, "cdpro": cdpro, "resultado": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# Debug: busca todas tabelas FC06xxx e FC07xxx (lotes e fabricação)
@app.route('/api/debug/tabelas-lotes', methods=['GET'])
def debug_tabelas_lotes():
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT RDB$RELATION_NAME 
            FROM RDB$RELATIONS 
            WHERE RDB$SYSTEM_FLAG = 0 
            AND (RDB$RELATION_NAME LIKE 'FC06%' 
                 OR RDB$RELATION_NAME LIKE 'FC07%'
                 OR RDB$RELATION_NAME LIKE '%LOT%')
            ORDER BY RDB$RELATION_NAME
        """)
        tabelas = [row[0].strip() for row in cursor.fetchall()]
        
        resultado = []
        for tabela in tabelas:
            try:
                cursor.execute("""
                    SELECT RF.RDB$FIELD_NAME, F.RDB$FIELD_TYPE, F.RDB$FIELD_LENGTH
                    FROM RDB$RELATION_FIELDS RF
                    JOIN RDB$FIELDS F ON RF.RDB$FIELD_SOURCE = F.RDB$FIELD_NAME
                    WHERE RF.RDB$RELATION_NAME = ?
                    ORDER BY RF.RDB$FIELD_POSITION
                """, (tabela,))
                colunas = [{
                    "nome": row[0].strip(),
                    "tipo": row[1],
                    "tamanho": row[2]
                } for row in cursor.fetchall()]
                
                cursor.execute(f"SELECT COUNT(*) FROM {tabela}")
                total = cursor.fetchone()[0]
                
                # Pega exemplo
                cursor.execute(f"SELECT FIRST 3 * FROM {tabela}")
                cols = [desc[0].strip() for desc in cursor.description]
                exemplos = []
                for row in cursor.fetchall():
                    exemplo = {}
                    for i, col in enumerate(cols):
                        val = row[i]
                        if hasattr(val, 'strftime'):
                            val = val.strftime('%d/%m/%Y')
                        elif hasattr(val, 'read'):
                            val = "[BLOB]"
                        elif val is not None:
                            val = str(val)[:100]
                        exemplo[col] = val
                    exemplos.append(exemplo)
                
                resultado.append({
                    "tabela": tabela,
                    "colunas": colunas,
                    "totalRegistros": total,
                    "exemplos": exemplos
                })
            except Exception as e:
                resultado.append({"tabela": tabela, "erro": str(e)})
        
        conn.close()
        return jsonify({"success": True, "tabelas": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# ENDPOINT PRINCIPAL - BUSCAR REQUISIÇÃO
# ============================================
@app.route('/api/requisicao/<nr_requisicao>', methods=['GET'])
def buscar_requisicao(nr_requisicao):
    filial = request.args.get('filial', '1')
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Busca dados da requisição
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
        
        # Busca itens da requisição (fórmulas) - incluindo CDPRIN para buscar composição de mesclas
        cursor.execute("""
            SELECT I.ITEMID, I.DESCR, I.QUANT, I.UNIDA, I.NRLOT, I.CDPRO, I.CDPRIN
            FROM FC12110 I
            WHERE I.NRRQU = ? AND I.CDFIL = ? AND I.TPCMP IN ('C', 'S')
            ORDER BY I.ITEMID
        """, (nr_requisicao, filial))
        
        itens = cursor.fetchall()
        
        # Lista de materiais a excluir da composição (embalagens, veículos, conservantes)
        materiais_excluir = [
            'TAMPA', 'SELO', 'FR AMBAR', 'FRASCO', 'AMPOLA',
            'SOLUCAO FISIOLOGICA', 'AGUA PARA INJETAVEIS', 'ALCOOL BENZILICO'
        ]
        
        # Função para simplificar nome de mesclas
        def simplificar_nome_mescla(nome_completo):
            """Extrai nome simplificado de mesclas (ex: 'AMP TRISH 10MG/ML' -> 'TRISH')"""
            if not nome_completo:
                return ""
            
            nome = nome_completo.upper().strip()
            
            # Remove prefixos comuns
            prefixos = ['AMP ', 'CX ', 'FRS ', 'PACOTE ', 'KIT ']
            for prefixo in prefixos:
                if nome.startswith(prefixo):
                    nome = nome[len(prefixo):]
                    break
            
            # Pega primeira palavra significativa (antes de números/concentração)
            partes = nome.split()
            if partes:
                nome_simples = partes[0]
                # Se nome muito curto ou genérico, pega mais palavras
                if len(nome_simples) < 3 and len(partes) > 1:
                    nome_simples = " ".join(partes[:2])
                return nome_simples
            
            return nome_completo
        
        data = []
        for idx, item in enumerate(itens):
            item_id = item[0]
            cdpro = item[5]
            cdprin = item[6]  # CDPRIN - código do produto principal (base para mesclas)
            nome_produto = item[1] or ""  # DESCR da FC12110
            
            # =====================================================
            # PRIORIDADE: Busca dados na FC99999 usando CDPRIN quando disponível
            # CDPRIN contém o código do produto base (ex: 92779 para TRISH)
            # CDPRO contém o código do produto específico (ex: 92781 para SKINBOOSTER)
            # =====================================================
            print(f"\n{'='*60}")
            print(f"DEBUG FC99999 - Item {item_id} (ITEMID original)")
            print(f"  CDPRO: '{cdpro}'")
            print(f"  CDPRIN: '{cdprin}'")
            print(f"  NOME PRODUTO: '{nome_produto}'")
            
            # Determina qual código usar para buscar composição
            # Se CDPRIN existe e é diferente de CDPRO, usa CDPRIN (é uma mescla/derivado)
            cdprin_str = str(cdprin).strip() if cdprin else ""
            cdpro_str = str(cdpro).strip()
            
            if cdprin_str and cdprin_str != cdpro_str and cdprin_str != '0':
                codigo_busca = cdprin_str
                print(f"  -> USANDO CDPRIN ({cdprin_str}) para buscar composição (MESCLA/DERIVADO)")
            else:
                codigo_busca = cdpro_str
                print(f"  -> USANDO CDPRO ({cdpro_str}) para buscar composição")
            
            codigo_busca_padded = codigo_busca.zfill(8)  # Ex: '00092779'
            
            print(f"  Código buscado: '{codigo_busca}'")
            print(f"  Código padded: '{codigo_busca_padded}'")
            
            # Query com match exato em múltiplos formatos usando codigo_busca (CDPRIN ou CDPRO)
            cursor.execute("""
                SELECT ARGUMENTO, SUBARGUM, PARAMETRO 
                FROM FC99999 
                WHERE ARGUMENTO = ? 
                   OR ARGUMENTO = ?
                   OR ARGUMENTO = ?
                   OR ARGUMENTO = ?
                ORDER BY SUBARGUM
            """, (codigo_busca, codigo_busca_padded, f'OBSFIC{codigo_busca}', f'OBSFIC{codigo_busca_padded}'))
            todos_args_exato = cursor.fetchall()
            print(f"  Argumentos EXATOS encontrados: {len(todos_args_exato)}")
            
            # Se não encontrou com exato, tenta CONTAINING com validação
            if not todos_args_exato:
                print(f"  -> Nenhum match exato. Tentando CONTAINING com validação...")
                cursor.execute("""
                    SELECT ARGUMENTO, SUBARGUM, PARAMETRO 
                    FROM FC99999 
                    WHERE ARGUMENTO CONTAINING ?
                    ORDER BY ARGUMENTO, SUBARGUM
                """, (codigo_busca,))
                todos_args_containing = cursor.fetchall()
                
                # Filtra registros que contêm o código buscado (correção: aceita sufixos)
                todos_args = []
                for arg in todos_args_containing:
                    argumento = arg[0].strip() if arg[0] else ""
                    # Remove prefixo OBSFIC para comparação
                    codigo_no_arg = argumento.replace("OBSFIC", "").strip()
                    
                    # Aceita se o código buscado está CONTIDO no argumento (não só terminando)
                    # Ex: OBSFIC9244614 -> extrai "9244614" -> contém "92446"? -> ACEITA
                    if (codigo_busca in codigo_no_arg or 
                        codigo_busca_padded in codigo_no_arg or
                        argumento.endswith(codigo_busca) or 
                        argumento.endswith(codigo_busca_padded)):
                        todos_args.append(arg)
                        print(f"    VALIDADO: '{argumento}' (código contido em '{codigo_no_arg}')")
                    else:
                        print(f"    REJEITADO: '{argumento}' (não corresponde ao código)")
                print(f"  Argumentos VALIDADOS após CONTAINING: {len(todos_args)}")
            else:
                todos_args = todos_args_exato
            
            # =====================================================
            # BUSCA EM CASCATA: Se não encontrou com CDPRIN, tenta CDPRO
            # =====================================================
            if not todos_args and cdprin_str and cdprin_str != cdpro_str and cdprin_str != '0':
                print(f"  -> Sem resultados com CDPRIN. Tentando CDPRO ({cdpro_str})...")
                cdpro_padded = cdpro_str.zfill(8)
                
                cursor.execute("""
                    SELECT ARGUMENTO, SUBARGUM, PARAMETRO 
                    FROM FC99999 
                    WHERE ARGUMENTO CONTAINING ?
                    ORDER BY ARGUMENTO, SUBARGUM
                """, (cdpro_str,))
                todos_args_cdpro = cursor.fetchall()
                
                # Valida os resultados da busca por CDPRO
                for arg in todos_args_cdpro:
                    argumento = arg[0].strip() if arg[0] else ""
                    codigo_no_arg = argumento.replace("OBSFIC", "").strip()
                    
                    if (cdpro_str in codigo_no_arg or 
                        cdpro_padded in codigo_no_arg or
                        argumento.endswith(cdpro_str) or 
                        argumento.endswith(cdpro_padded)):
                        todos_args.append(arg)
                        print(f"    VALIDADO (CDPRO): '{argumento}'")
                
                print(f"  Argumentos encontrados via CDPRO: {len(todos_args)}")
            
            # Inicializa variáveis para dados da FC99999
            ativos_mescla = []
            aplicacao_fc99999 = ""
            
            # Lista de prefixos/palavras que indicam que NÃO é um ativo real
            IGNORAR_ATIVOS = ['ETIQUETA', 'CATALOGO', 'PREGA', 'SUG.', 'SUGESTAO', 'CATÁLOGO', 'INSTRUC', 'AVISO']
            
            # Processa TODOS os registros encontrados
            for arg in todos_args:
                argumento = arg[0]
                subargum = str(arg[1]).strip().zfill(5)
                texto = arg[2]
                
                # Trata BLOB se necessário
                if texto and hasattr(texto, 'read'):
                    texto = texto.read().decode('latin-1')
                texto = texto.strip() if texto else ""
                
                if not texto:
                    continue
                
                param_preview = texto[:80] if texto else 'NULL'
                print(f"    - ARG: {argumento}, SUB: {subargum}, PARAM: {param_preview}...")
                
                texto_upper = texto.upper()
                
                # Verifica se é APLICAÇÃO (pode estar em qualquer SUBARGUM)
                if "APLICA" in texto_upper and ":" in texto:
                    aplicacao_fc99999 = texto.split(":", 1)[1].strip()
                    print(f"  -> APLICAÇÃO encontrada: '{aplicacao_fc99999}'")
                    continue
                
                # =====================================================
                # EXPANDIDO: Aceita QUALQUER SUBARGUM para ativos
                # (antes só aceitava 00001 e 00002)
                # =====================================================
                # Ignora se contém palavra de exclusão
                if any(ignorar in texto_upper for ignorar in IGNORAR_ATIVOS):
                    print(f"    IGNORADO (não é ativo): '{texto[:50]}...'")
                    continue
                
                # Ignora se parece ser instrução ou texto muito longo sem vírgula
                if len(texto) > 200 and ',' not in texto:
                    print(f"    IGNORADO (texto muito longo sem ativos): '{texto[:50]}...'")
                    continue
                
                # Remove prefixo OBS: se existir
                texto_limpo = texto
                if texto_upper.startswith("OBS:"):
                    texto_limpo = texto[4:].strip()
                elif texto_upper.startswith("OBS :"):
                    texto_limpo = texto[5:].strip()
                
                if texto_limpo.strip():
                    ativos_mescla.append(texto_limpo)
                    print(f"  -> ATIVO encontrado (SUB:{subargum}): '{texto_limpo[:50]}...'")

            # =====================================================
            # LÓGICA: PRODUTO ÚNICO vs MESCLA
            # =====================================================
            # Compara nome do produto com os ativos encontrados na FC99999
            nome_produto_upper = nome_produto.upper()
            
            e_mescla = False
            composicao = ""
            nome_formula = nome_produto  # Padrão: usa nome original
            
            if ativos_mescla:
                primeiro_ativo = ativos_mescla[0] if ativos_mescla else ""
                
                # =====================================================
                # NOVA LÓGICA DE CLASSIFICAÇÃO (mais confiável)
                # =====================================================
                
                # CRITÉRIO 1: CDPRIN diferente de CDPRO indica derivado/mescla
                if cdprin_str and cdprin_str != cdpro_str and cdprin_str != '0':
                    e_mescla = True
                    print(f"  -> MESCLA (CDPRIN {cdprin_str} diferente de CDPRO {cdpro_str})")
                
                # CRITÉRIO 2: Primeiro ativo contém vírgula (lista de componentes)
                elif ',' in primeiro_ativo:
                    e_mescla = True
                    print(f"  -> MESCLA (ativos com vírgula = múltiplos componentes)")
                
                # CRITÉRIO 3: Nome do produto NÃO está contido no ativo
                elif primeiro_ativo and nome_produto_upper not in primeiro_ativo.upper():
                    # Verifica se é realmente diferente usando palavras-chave
                    palavras_produto = [p for p in nome_produto_upper.split() if len(p) > 3]
                    if not any(p in primeiro_ativo.upper() for p in palavras_produto[:2]):
                        e_mescla = True
                        print(f"  -> MESCLA (ativo diferente do nome do produto)")
                
                if e_mescla:
                    # É MESCLA: usa o primeiro ativo como composição (geralmente é a lista completa)
                    composicao = primeiro_ativo
                    # Remove prefixo AMP do nome se houver
                    nome_formula = nome_produto.replace("AMP ", "").strip()
                    print(f"  -> TIPO: MESCLA")
                    print(f"  -> COMPOSIÇÃO: '{composicao[:60]}...'")
                else:
                    # É PRODUTO ÚNICO: sem composição extra
                    composicao = ""
                    print(f"  -> TIPO: PRODUTO ÚNICO")
            else:
                # Fallback: busca matérias-primas (R) do mesmo ITEMID
                cursor.execute("""
                    SELECT DESCR
                    FROM FC12110
                    WHERE NRRQU = ? AND CDFIL = ? AND ITEMID = ? AND TPCMP = 'R'
                    ORDER BY DESCR
                """, (nr_requisicao, filial, item_id))
                
                materias_primas = cursor.fetchall()
                
                # Filtra apenas ativos (exclui embalagens e veículos)
                ativos = []
                for mp in materias_primas:
                    descr = mp[0] or ""
                    descr_upper = descr.upper()
                    
                    # Verifica se é material a excluir
                    excluir = False
                    for excl in materiais_excluir:
                        if excl in descr_upper:
                            excluir = True
                            break
                    
                    if not excluir and descr.strip():
                        # Evita duplicatas
                        if descr.strip() not in ativos:
                            ativos.append(descr.strip())
                
                # Se encontrou múltiplos ativos diferentes, pode ser mescla
                if len(ativos) > 1:
                    composicao = " + ".join(ativos)
                    e_mescla = True
                    nome_formula = simplificar_nome_mescla(nome_produto)
            
            # =====================================================
            # APLICAÇÃO: Prioriza FC99999, fallback para FC03300
            # =====================================================
            aplicacao = aplicacao_fc99999
            descricao_produto = ""
            
            # Fallback para FC03300 se não encontrou aplicação na FC99999
            if not aplicacao:
                cursor.execute("""
                    SELECT CDICP, OBSER 
                    FROM FC03300 
                    WHERE CDPRO = ?
                    ORDER BY CDICP
                """, (cdpro,))
                
                observacoes = cursor.fetchall()
                
                for obs in observacoes:
                    cdicp = str(obs[0]).strip().zfill(5)
                    texto = obs[1]
                    if texto and hasattr(texto, 'read'):
                        texto = texto.read().decode('latin-1')
                    texto = texto.strip() if texto else ""
                    
                    texto_upper = texto.upper()
                    if texto_upper.startswith("APLICAÇÃO:") or texto_upper.startswith("APLICACAO:"):
                        if texto_upper.startswith("APLICAÇÃO:"):
                            aplicacao = texto[10:].strip()
                        else:
                            aplicacao = texto[10:].strip()
                    elif cdicp == '00004' and not descricao_produto:
                        descricao_produto = texto
            
            # Limpa aplicação se for muito longa ou contiver vírgulas (indica lista de ativos)
            if len(aplicacao) > 30 or ',' in aplicacao:
                aplicacao = ""
            
            rotulo = {
                **dados_base,
                "nrItem": str(item_id),  # USA ITEMID ORIGINAL (corrige ordenação)
                "formula": nome_formula,  # Nome simplificado para mesclas
                "volume": str(item[2]) if item[2] else dados_base["volume"],
                "unidadeVolume": item[3] or dados_base["unidadeVolume"],
                "lote": (item[4] or "").strip(),
                "quantidade": str(int(item[2])) if item[2] else "",
                "composicao": composicao,
                "aplicacao": aplicacao,
                "descricaoProduto": descricao_produto,
                "observacoes": composicao,
                "tipoItem": "MESCLA" if e_mescla else "PRODUTO ÚNICO",  # Novo campo para debug
            }
            data.append(rotulo)
        
        conn.close()
        
        if not data:
            data = [{**dados_base, "nrItem": "1", "formula": "", "lote": "", "quantidade": "", "observacoes": "", "composicao": "", "aplicacao": "", "descricaoProduto": ""}]
        
        return jsonify({"success": True, "data": data})
        
    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

# ============================================
# FUNÇÕES DE IMPRESSÃO
# ============================================

def gerar_ppla_ampcx(rotulo, farmacia):
    """
    Gera comandos PPLA para layout AMP_CX (76mm x 35mm).
    Argox OS-2140 @ 203dpi: 76mm = 608 dots, 35mm = 280 dots
    """
    # Dados do rótulo
    paciente = (rotulo.get('nomePaciente', '') or '')[:35].upper()
    nr_req = rotulo.get('nrRequisicao', '')
    nr_item = rotulo.get('nrItem', '1')
    
    # Médico
    nome_medico = (rotulo.get('nomeMedico', '') or '').upper()
    prefixo_crm = rotulo.get('prefixoCRM', '')
    numero_crm = rotulo.get('numeroCRM', '')
    uf_crm = rotulo.get('ufCRM', '')
    crm_completo = f"{prefixo_crm}{numero_crm}/{uf_crm}".strip('/')
    
    # Composição (prioriza composicao, senão usa formula)
    composicao = rotulo.get('composicao', '') or rotulo.get('formula', '')
    composicao = (composicao or '')[:50].upper()
    
    # Dados de fabricação
    ph = rotulo.get('ph', '')
    lote = rotulo.get('lote', '')
    fab = rotulo.get('dataFabricacao', '')
    val = rotulo.get('dataValidade', '')
    
    # Aplicação e conteúdo
    aplicacao = (rotulo.get('aplicacao', '') or '')[:30].upper()
    contem = (rotulo.get('contem', '') or '')[:30].upper()
    
    # Registro
    registro = rotulo.get('numeroRegistro', '')
    
    # Monta linha 4: pH, Lote, Fab, Val
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
    
    # Comandos PPLA
    # A = texto: x,y,rotação,fonte,mult_h,mult_v,N/R,texto
    # Fonte 2 = 10x16, Fonte 1 = 8x12
    comandos = [
        "N",                                                    # Limpa buffer
        "q608",                                                 # Largura em dots
        "Q280,24",                                              # Altura + gap
        f'A20,15,0,2,1,1,N,"{paciente}"',                       # L1: Paciente
        f'A470,15,0,1,1,1,N,"REQ:{nr_req}-{nr_item}"',          # L1: Requisição (direita)
        f'A20,45,0,1,1,1,N,"DR. {nome_medico[:25]} CRM {crm_completo}"',  # L2: Médico
        f'A20,75,0,2,1,1,N,"{composicao}"',                     # L3: Composição
        f'A20,105,0,1,1,1,N,"{linha4}"',                        # L4: pH/Lote/Fab/Val
        f'A20,135,0,1,1,1,N,"APLICACAO: {aplicacao}"',          # L5: Aplicação
        f'A20,165,0,1,1,1,N,"CONTEM: {contem}"',                # L6: Contém
        f'A20,195,0,1,1,1,N,"Reg: {registro}"',                 # L7: Registro
        "P1",                                                   # Imprime 1 cópia
    ]
    
    return "\r\n".join(comandos)


def imprimir_compartilhada(caminho_impressora, comandos):
    """
    Envia comandos PPLA para impressora compartilhada Windows.
    caminho_impressora: ex: \\\\Campos2\\Campos2
    """
    if not PRINTING_AVAILABLE:
        return {"success": False, "error": "pywin32 não disponível"}
    
    try:
        # Abre a impressora
        hPrinter = win32print.OpenPrinter(caminho_impressora)
        
        try:
            # Inicia documento
            hJob = win32print.StartDocPrinter(hPrinter, 1, ("Etiqueta", None, "RAW"))
            
            try:
                win32print.StartPagePrinter(hPrinter)
                
                # Codifica comandos em CP850 (padrão Argox)
                dados = comandos.encode('cp850', errors='replace')
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
# ENDPOINTS DE IMPRESSÃO
# ============================================

@app.route('/api/verificar-impressora', methods=['POST'])
def verificar_impressora():
    """Verifica se a impressora está acessível."""
    if not PRINTING_AVAILABLE:
        return jsonify({"success": False, "error": "pywin32 não instalado no servidor"}), 500
    
    data = request.get_json()
    caminho = data.get('caminho', '')
    
    if not caminho:
        return jsonify({"success": False, "error": "Caminho da impressora não informado"}), 400
    
    try:
        hPrinter = win32print.OpenPrinter(caminho)
        win32print.ClosePrinter(hPrinter)
        return jsonify({"success": True, "message": "Impressora acessível"})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/imprimir-teste', methods=['POST'])
def imprimir_teste():
    """Imprime etiqueta de teste."""
    if not PRINTING_AVAILABLE:
        return jsonify({"success": False, "error": "pywin32 não instalado no servidor"}), 500
    
    data = request.get_json()
    caminho = data.get('caminho', '')
    
    if not caminho:
        return jsonify({"success": False, "error": "Caminho da impressora não informado"}), 400
    
    # Etiqueta de teste simples
    comandos = [
        "N",
        "q608",
        "Q280,24",
        'A20,50,0,3,1,1,N,"*** TESTE DE IMPRESSAO ***"',
        'A20,100,0,2,1,1,N,"Argox OS-2140 - PPLA"',
        'A20,150,0,2,1,1,N,"Impressora configurada com sucesso!"',
        'A20,200,0,1,1,1,N,"Sistema de Rotulos - Pro Pharmacos"',
        "P1",
    ]
    
    resultado = imprimir_compartilhada(caminho, "\r\n".join(comandos))
    
    if resultado["success"]:
        return jsonify({"success": True, "message": "Etiqueta de teste enviada"})
    else:
        return jsonify({"success": False, "error": resultado["error"]}), 500


@app.route('/api/imprimir', methods=['POST'])
def imprimir_rotulos():
    """Imprime rótulos selecionados."""
    if not PRINTING_AVAILABLE:
        return jsonify({"success": False, "error": "pywin32 não instalado no servidor"}), 500
    
    data = request.get_json()
    caminho = data.get('caminho', '')
    rotulos = data.get('rotulos', [])
    layout_tipo = data.get('layoutTipo', 'AMP_CX')
    farmacia = data.get('farmacia', {})
    
    if not caminho:
        return jsonify({"success": False, "error": "Caminho da impressora não informado"}), 400
    
    if not rotulos:
        return jsonify({"success": False, "error": "Nenhum rótulo para imprimir"}), 400
    
    impressos = 0
    erros = []
    
    for rotulo in rotulos:
        try:
            # Gera comandos PPLA (por enquanto só AMP_CX)
            if layout_tipo == 'AMP_CX':
                comandos = gerar_ppla_ampcx(rotulo, farmacia)
            else:
                # Para outros layouts, usa o mesmo por enquanto
                comandos = gerar_ppla_ampcx(rotulo, farmacia)
            
            resultado = imprimir_compartilhada(caminho, comandos)
            
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
    print("Servidor iniciando na porta 5000...")
    print(f"Impressão disponível: {PRINTING_AVAILABLE}")
    print("Teste: http://localhost:5000/api/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
