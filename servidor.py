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
        
        # Busca itens da requisição (fórmulas)
        cursor.execute("""
            SELECT I.ITEMID, I.DESCR, I.QUANT, I.UNIDA, I.NRLOT, I.CDPRO
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
        
        data = []
        for idx, item in enumerate(itens):
            item_id = item[0]
            cdpro = item[5]
            
            # Busca matérias-primas (R) do mesmo ITEMID para composição
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
            
            # Monta composição concatenando os ativos
            composicao = " + ".join(ativos)
            
            # Busca observações do produto (aplicação, descrição) via FC03300
            aplicacao = ""
            descricao_produto = ""
            
            cursor.execute("""
                SELECT CDICP, OBSER 
                FROM FC03300 
                WHERE CDPRO = ? AND TPFORMAFARMA = ?
                ORDER BY CDICP
            """, (cdpro, tipo_forma))
            
            observacoes = cursor.fetchall()
            
            for obs in observacoes:
                cdicp = str(obs[0]).strip().zfill(5)
                texto = obs[1]
                if texto and hasattr(texto, 'read'):
                    texto = texto.read().decode('latin-1')
                
                if cdicp == '00003':  # Aplicação
                    aplicacao = texto.strip() if texto else ""
                elif cdicp == '00004':  # Descrição do produto
                    descricao_produto = texto.strip() if texto else ""
            
            # Limpa prefixo "APLICAÇÃO:" se existir
            if aplicacao.upper().startswith("APLICAÇÃO:"):
                aplicacao = aplicacao[10:].strip()
            elif aplicacao.upper().startswith("APLICACAO:"):
                aplicacao = aplicacao[10:].strip()
            
            rotulo = {
                **dados_base,
                "nrItem": str(idx + 1),
                "formula": item[1] or "",
                "volume": str(item[2]) if item[2] else dados_base["volume"],
                "unidadeVolume": item[3] or dados_base["unidadeVolume"],
                "lote": (item[4] or "").strip(),
                "quantidade": str(int(item[2])) if item[2] else "",
                "composicao": composicao,  # Ativos via ITEMID
                "aplicacao": aplicacao,  # Vem do banco (ID, SC, EV, IM)
                "descricaoProduto": descricao_produto,
                "observacoes": composicao,  # Mesma composição para observações
            }
            data.append(rotulo)
        
        conn.close()
        
        if not data:
            data = [{**dados_base, "nrItem": "1", "formula": "", "lote": "", "quantidade": "", "observacoes": "", "composicao": "", "aplicacao": "", "descricaoProduto": ""}]
        
        return jsonify({"success": True, "data": data})
        
    except Exception as e:
        print(f"Erro: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == '__main__':
    print("=" * 50)
    print("Servidor iniciando na porta 5000...")
    print("Teste: http://localhost:5000/api/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True)
