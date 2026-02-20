from flask import Flask, jsonify, request
from flask_cors import CORS
import fdb
import platform
import base64

try:
    import requests as http_requests
    HTTP_REQUESTS_OK = True
except ImportError:
    HTTP_REQUESTS_OK = False
    print("AVISO: 'requests' não instalado. pip install requests")

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

# Debug: FC12110 completo - mostra TODOS os campos para descobrir campo de ordenação
@app.route('/api/debug/fc12110-completo/<nr_requisicao>', methods=['GET'])
def debug_fc12110_completo(nr_requisicao):
    """
    Endpoint para investigar campos de ordenação da FC12110.
    Retorna TODOS os campos da tabela para identificar qual campo
    corresponde à ordem visual das 'barras' no FórmulaCerta.
    """
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        cursor.execute("""
            SELECT * FROM FC12110 
            WHERE NRRQU = ? AND CDFIL = ? AND TPCMP IN ('C', 'S')
            ORDER BY ITEMID
        """, (nr_requisicao, filial))
        
        colunas = [desc[0].strip() for desc in cursor.description]
        itens = []
        for row in cursor.fetchall():
            item = {}
            for i, col in enumerate(colunas):
                val = row[i]
                if hasattr(val, 'read'):
                    try:
                        val = val.read().decode('latin-1')[:200]
                    except:
                        val = "[BLOB]"
                elif hasattr(val, 'strftime'):
                    val = val.strftime('%d/%m/%Y %H:%M:%S')
                item[col] = str(val) if val is not None else None
            itens.append(item)
        
        conn.close()
        return jsonify({
            "success": True,
            "requisicao": nr_requisicao,
            "filial": filial,
            "totalColunas": len(colunas),
            "totalItens": len(itens),
            "colunas": colunas,
            "itens": itens
        })
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

# Debug: Testa identificação de KIT via FC12111 para uma requisição/serier
@app.route('/api/debug/fc12111/<nrrqu>/<serier>', methods=['GET'])
def debug_fc12111(nrrqu, serier):
    """
    Endpoint para testar a nova lógica de identificação de KIT via FC12111.
    Retorna os componentes encontrados e seus dados de lote.
    """
    filial = request.args.get('filial', '279')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {
            "nrrqu": nrrqu,
            "serier": serier,
            "cdfil": filial,
            "e_kit": False,
            "fc12111_count": 0,
            "colunas_fc12111": [],
            "componentes": []
        }
        
        # Descobre colunas da FC12111
        try:
            cursor.execute("""
                SELECT TRIM(RDB$FIELD_NAME) 
                FROM RDB$RELATION_FIELDS 
                WHERE RDB$RELATION_NAME = 'FC12111'
            """)
            resultado["colunas_fc12111"] = [row[0] for row in cursor.fetchall()]
        except Exception as e:
            resultado["erro_colunas"] = str(e)
        
        # Conta registros
        try:
            cursor.execute("""
                SELECT COUNT(*) FROM FC12111 
                WHERE NRRQU = ? AND SERIER = ? AND CDFIL = ?
            """, (nrrqu, serier, filial))
            row = cursor.fetchone()
            resultado["fc12111_count"] = row[0] if row else 0
            resultado["e_kit"] = resultado["fc12111_count"] > 0
        except Exception as e:
            resultado["erro_count"] = str(e)
        
        # Busca componentes se for KIT
        if resultado["e_kit"]:
            try:
                cursor.execute("""
                    SELECT c.*, p.DESCR
                    FROM FC12111 c
                    LEFT JOIN FC03000 p ON p.CDPRO = c.CDPRO
                    WHERE c.NRRQU = ? AND c.SERIER = ? AND c.CDFIL = ?
                """, (nrrqu, serier, filial))
                
                colunas = [desc[0].strip() for desc in cursor.description]
                for row in cursor.fetchall():
                    comp = {}
                    for i, col in enumerate(colunas):
                        val = row[i]
                        if hasattr(val, 'strftime'):
                            val = val.strftime('%d/%m/%Y')
                        elif val is not None:
                            val = str(val)
                        comp[col] = val
                    resultado["componentes"].append(comp)
            except Exception as e:
                resultado["erro_componentes"] = str(e)
        
        conn.close()
        return jsonify({"success": True, **resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


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
# DEBUG: Testar identificação de KIT (Nova lógica multi-camada)
# ============================================
@app.route('/api/debug/testar-kit/<cdpro>', methods=['GET'])
def debug_testar_kit(cdpro):
    """
    Endpoint de debug para testar a identificação de KIT com a nova lógica multi-camada.
    Testa todas as estratégias e retorna o resultado de cada uma.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {
            "cdpro": cdpro,
            "estrategias": []
        }
        
        # 1. Busca descrição do produto
        descr_produto = ""
        try:
            cursor.execute("""
                SELECT DESCR, NOMRED FROM FC03000 WHERE CDPRO = ?
            """, (cdpro,))
            row = cursor.fetchone()
            if row:
                descr_produto = row[0] or ""
                resultado["produto"] = {
                    "descr": row[0],
                    "nomred": row[1],
                    "contem_kit_no_nome": "KIT" in (row[0] or "").upper() or "KIT" in (row[1] or "").upper()
                }
        except Exception as e:
            resultado["erro_produto"] = str(e)
        
        # 2. ESTRATÉGIA: FC05000 (CDSEM = CDPRO) → CDFRM
        try:
            cursor.execute("""
                SELECT * FROM FC05000 WHERE CDSEM = ?
            """, (cdpro,))
            cols = [desc[0].strip() for desc in cursor.description]
            rows = cursor.fetchall()
            
            registros = []
            cdfrm_encontrado = None
            for row in rows:
                reg = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif val is not None:
                        val = str(val)[:100]
                    reg[col] = val
                    if col == 'CDFRM':
                        cdfrm_encontrado = row[i]
                registros.append(reg)
            
            resultado["estrategias"].append({
                "nome": "FC05000 onde CDSEM = CDPRO",
                "query": f"SELECT * FROM FC05000 WHERE CDSEM = {cdpro}",
                "total": len(registros),
                "cdfrm_encontrado": cdfrm_encontrado,
                "registros": registros
            })
            
            # 3. Se encontrou CDFRM, busca componentes na FC05100
            if cdfrm_encontrado:
                cursor.execute("""
                    SELECT * FROM FC05100 WHERE CDFRM = ?
                """, (cdfrm_encontrado,))
                cols2 = [desc[0].strip() for desc in cursor.description]
                rows2 = cursor.fetchall()
                
                componentes = []
                for row2 in rows2:
                    comp = {}
                    for i, col in enumerate(cols2):
                        val = row2[i]
                        if hasattr(val, 'strftime'):
                            val = val.strftime('%d/%m/%Y')
                        elif val is not None:
                            val = str(val)[:100]
                        comp[col] = val
                    
                    # Busca nome do componente
                    cdsac = None
                    for key in ['CDSAC', 'CDPRO', 'CDCOMP']:
                        if key in comp:
                            cdsac = comp[key]
                            break
                    
                    if cdsac:
                        try:
                            cursor.execute("SELECT DESCR FROM FC03000 WHERE CDPRO = ?", (cdsac,))
                            nome_row = cursor.fetchone()
                            if nome_row:
                                comp["NOME_COMPONENTE"] = nome_row[0]
                        except:
                            pass
                    
                    componentes.append(comp)
                
                resultado["estrategias"].append({
                    "nome": f"FC05100 onde CDFRM = {cdfrm_encontrado}",
                    "query": f"SELECT * FROM FC05100 WHERE CDFRM = {cdfrm_encontrado}",
                    "total": len(componentes),
                    "componentes": componentes
                })
        
        except Exception as e:
            resultado["estrategias"].append({
                "nome": "FC05000 onde CDSEM = CDPRO",
                "erro": str(e)
            })
        
        # 4. ESTRATÉGIA: FC03600 (TPASS contém 'KIT')
        try:
            cursor.execute("""
                SELECT * FROM FC03600 WHERE CDPRO = ? AND UPPER(TPASS) CONTAINING 'KIT'
            """, (cdpro,))
            cols = [desc[0].strip() for desc in cursor.description]
            rows = cursor.fetchall()
            
            registros = []
            for row in rows:
                reg = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif val is not None:
                        val = str(val)[:100]
                    reg[col] = val
                registros.append(reg)
            
            resultado["estrategias"].append({
                "nome": "FC03600 onde CDPRO = CDPRO e TPASS contém KIT",
                "query": f"SELECT * FROM FC03600 WHERE CDPRO = {cdpro} AND UPPER(TPASS) CONTAINING 'KIT'",
                "total": len(registros),
                "registros": registros
            })
        except Exception as e:
            resultado["estrategias"].append({
                "nome": "FC03600 onde CDPRO = CDPRO e TPASS contém KIT",
                "erro": str(e)
            })
        
        # 5. Veredicto final
        e_kit = False
        motivo = ""
        
        for est in resultado["estrategias"]:
            if est.get("total", 0) > 0:
                if "FC05100" in est.get("nome", ""):
                    e_kit = True
                    motivo = "Componentes encontrados via FC05000/FC05100"
                    break
                elif "FC03600" in est.get("nome", ""):
                    e_kit = True
                    motivo = "Componentes encontrados via FC03600"
                    break
        
        if not e_kit and resultado.get("produto", {}).get("contem_kit_no_nome"):
            e_kit = True
            motivo = "Identificado pelo nome (contém 'KIT')"
        
        resultado["veredicto"] = {
            "e_kit": e_kit,
            "motivo": motivo if e_kit else "Nenhuma estratégia encontrou componentes"
        }
        
        conn.close()
        return jsonify({"success": True, "resultado": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================
# DEBUG: FC05000/FC05100 - Estrutura de Kits (Nova lógica)
# ============================================
@app.route('/api/debug/estrutura-kit', methods=['GET'])
def debug_estrutura_kit():
    """
    Endpoint de debug para investigar a estrutura das tabelas FC05000 e FC05100.
    Retorna colunas e exemplos de registros para entender o mapeamento correto.
    """
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {}
        
        # Analisa FC05000 (tabela de cabeçalho de kits)
        try:
            cursor.execute("""
                SELECT RF.RDB$FIELD_NAME
                FROM RDB$RELATION_FIELDS RF
                WHERE RF.RDB$RELATION_NAME = 'FC05000'
                ORDER BY RF.RDB$FIELD_POSITION
            """)
            colunas_fc05000 = [row[0].strip() for row in cursor.fetchall()]
            
            cursor.execute("SELECT FIRST 10 * FROM FC05000")
            cols = [desc[0].strip() for desc in cursor.description]
            exemplos_fc05000 = []
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
                exemplos_fc05000.append(exemplo)
            
            resultado["FC05000"] = {
                "colunas": colunas_fc05000,
                "exemplos": exemplos_fc05000
            }
        except Exception as e:
            resultado["FC05000"] = {"erro": str(e)}
        
        # Analisa FC05100 (tabela de componentes de kits)
        try:
            cursor.execute("""
                SELECT RF.RDB$FIELD_NAME
                FROM RDB$RELATION_FIELDS RF
                WHERE RF.RDB$RELATION_NAME = 'FC05100'
                ORDER BY RF.RDB$FIELD_POSITION
            """)
            colunas_fc05100 = [row[0].strip() for row in cursor.fetchall()]
            
            cursor.execute("SELECT FIRST 10 * FROM FC05100")
            cols = [desc[0].strip() for desc in cursor.description]
            exemplos_fc05100 = []
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
                exemplos_fc05100.append(exemplo)
            
            resultado["FC05100"] = {
                "colunas": colunas_fc05100,
                "exemplos": exemplos_fc05100
            }
        except Exception as e:
            resultado["FC05100"] = {"erro": str(e)}
        
        # Analisa FC03140 (tabela de lotes - se existir)
        try:
            cursor.execute("""
                SELECT RF.RDB$FIELD_NAME
                FROM RDB$RELATION_FIELDS RF
                WHERE RF.RDB$RELATION_NAME = 'FC03140'
                ORDER BY RF.RDB$FIELD_POSITION
            """)
            colunas_fc03140 = [row[0].strip() for row in cursor.fetchall()]
            
            cursor.execute("SELECT FIRST 5 * FROM FC03140")
            cols = [desc[0].strip() for desc in cursor.description]
            exemplos_fc03140 = []
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
                exemplos_fc03140.append(exemplo)
            
            resultado["FC03140"] = {
                "colunas": colunas_fc03140,
                "exemplos": exemplos_fc03140
            }
        except Exception as e:
            resultado["FC03140"] = {"erro": str(e)}
        
        conn.close()
        return jsonify({"success": True, "resultado": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/debug/componentes-kit/<cdpro>', methods=['GET'])
def debug_componentes_kit_cdpro(cdpro):
    """
    Endpoint de debug para buscar componentes de um kit específico por CDPRO.
    Testa múltiplas estratégias de busca para encontrar os componentes.
    """
    filial = request.args.get('filial', '1')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        resultado = {
            "cdpro_buscado": cdpro,
            "filial": filial,
            "estrategias": []
        }
        
        # ESTRATÉGIA 1: FC05100 com CDFRM = CDPRO
        try:
            cursor.execute("""
                SELECT * FROM FC05100 WHERE CDFRM = ?
            """, (cdpro,))
            cols = [desc[0].strip() for desc in cursor.description]
            rows = cursor.fetchall()
            registros = []
            for row in rows:
                reg = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif hasattr(val, 'read'):
                        val = "[BLOB]"
                    elif val is not None:
                        val = str(val)[:100]
                    reg[col] = val
                registros.append(reg)
            resultado["estrategias"].append({
                "nome": "FC05100 onde CDFRM = CDPRO",
                "query": f"SELECT * FROM FC05100 WHERE CDFRM = {cdpro}",
                "total": len(registros),
                "registros": registros
            })
        except Exception as e:
            resultado["estrategias"].append({
                "nome": "FC05100 onde CDFRM = CDPRO",
                "erro": str(e)
            })
        
        # ESTRATÉGIA 2: FC05100 com CDPRO = CDPRO (campo alternativo)
        try:
            cursor.execute("""
                SELECT * FROM FC05100 WHERE CDPRO = ?
            """, (cdpro,))
            cols = [desc[0].strip() for desc in cursor.description]
            rows = cursor.fetchall()
            registros = []
            for row in rows:
                reg = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif hasattr(val, 'read'):
                        val = "[BLOB]"
                    elif val is not None:
                        val = str(val)[:100]
                    reg[col] = val
                registros.append(reg)
            resultado["estrategias"].append({
                "nome": "FC05100 onde CDPRO = CDPRO",
                "query": f"SELECT * FROM FC05100 WHERE CDPRO = {cdpro}",
                "total": len(registros),
                "registros": registros
            })
        except Exception as e:
            resultado["estrategias"].append({
                "nome": "FC05100 onde CDPRO = CDPRO",
                "erro": str(e)
            })
        
        # ESTRATÉGIA 3: FC05000 (tabela de cabeçalho de kits)
        try:
            cursor.execute("""
                SELECT * FROM FC05000 WHERE CDFRM = ?
            """, (cdpro,))
            cols = [desc[0].strip() for desc in cursor.description]
            rows = cursor.fetchall()
            registros = []
            for row in rows:
                reg = {}
                for i, col in enumerate(cols):
                    val = row[i]
                    if hasattr(val, 'strftime'):
                        val = val.strftime('%d/%m/%Y')
                    elif hasattr(val, 'read'):
                        val = "[BLOB]"
                    elif val is not None:
                        val = str(val)[:100]
                    reg[col] = val
                registros.append(reg)
            resultado["estrategias"].append({
                "nome": "FC05000 onde CDFRM = CDPRO",
                "query": f"SELECT * FROM FC05000 WHERE CDFRM = {cdpro}",
                "total": len(registros),
                "registros": registros
            })
        except Exception as e:
            resultado["estrategias"].append({
                "nome": "FC05000 onde CDFRM = CDPRO",
                "erro": str(e)
            })
        
        # ESTRATÉGIA 4: Buscar por DESCR na FC03000 se começa com "KIT"
        try:
            cursor.execute("""
                SELECT CDPRO, DESCR, NOMRED FROM FC03000 WHERE CDPRO = ?
            """, (cdpro,))
            row = cursor.fetchone()
            if row:
                resultado["produto"] = {
                    "cdpro": row[0],
                    "descr": row[1],
                    "nomred": row[2],
                    "e_kit_pelo_nome": "KIT" in (row[1] or "").upper() or "KIT" in (row[2] or "").upper()
                }
        except Exception as e:
            resultado["produto"] = {"erro": str(e)}
        
        conn.close()
        return jsonify({"success": True, "resultado": resultado})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


# ============================================
# DEBUG: FC12111 - Componentes de Kit por Requisição
# ============================================
@app.route('/api/debug/fc12111/<nrrqu>/<serier>', methods=['GET'])
def debug_fc12111(nrrqu, serier):
    """
    Endpoint de debug para validar componentes de kit na FC12111.
    FC12111 vincula: NRRQU + SERIER → CDPRO (componentes)
    """
    filial = request.args.get('filial', '279')
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Busca componentes do kit na FC12111
        cursor.execute("""
            SELECT 
                c.CDPRO,
                c.CDPRIN,
                c.QUANT,
                c.UNIDADE,
                c.ORDCAP,
                c.TPCMP,
                p.NOMRED,
                p.DESCR
            FROM FC12111 c
            LEFT JOIN FC03000 p ON c.CDPRO = p.CDPRO
            WHERE c.NRRQU = ? AND c.SERIER = ? AND c.CDFIL = ?
            ORDER BY c.ORDCAP
        """, (nrrqu, serier, filial))
        
        componentes = []
        for row in cursor.fetchall():
            cdpro_comp = row[0]
            
            # Busca metadados do componente (pH, lote, datas)
            ph = ""
            lote = ""
            fab = ""
            val = ""
            
            # Tenta FC06100
            try:
                cursor.execute("""
                    SELECT FIRST 1 NRLOT, DTFAB, DTVAL, PH
                    FROM FC06100
                    WHERE CDPRO = ? AND CDFIL = ?
                    ORDER BY DTVAL DESC
                """, (cdpro_comp, filial))
                lote_row = cursor.fetchone()
                if lote_row:
                    lote = str(lote_row[0]).strip() if lote_row[0] else ""
                    fab = lote_row[1].strftime('%d/%m/%Y') if lote_row[1] else ""
                    val = lote_row[2].strftime('%d/%m/%Y') if lote_row[2] else ""
                    ph = str(lote_row[3]).strip() if lote_row[3] else ""
            except:
                pass
            
            # Fallback FC07100
            if not lote:
                try:
                    cursor.execute("""
                        SELECT FIRST 1 NRLOT, DTFAB, DTVAL
                        FROM FC07100
                        WHERE CDPRO = ? AND CDFIL = ?
                        ORDER BY DTVAL DESC
                    """, (cdpro_comp, filial))
                    lote_row = cursor.fetchone()
                    if lote_row:
                        lote = str(lote_row[0]).strip() if lote_row[0] else ""
                        fab = lote_row[1].strftime('%d/%m/%Y') if lote_row[1] else ""
                        val = lote_row[2].strftime('%d/%m/%Y') if lote_row[2] else ""
                except:
                    pass
            
            componentes.append({
                "cdpro": row[0],
                "cdprin": row[1],
                "quant": str(row[2]) if row[2] else "",
                "unidade": row[3],
                "ordcap": row[4],
                "tpcmp": row[5],
                "nomred": row[6],
                "descr": row[7],
                "metadados": {
                    "ph": ph,
                    "lote": lote,
                    "fabricacao": fab,
                    "validade": val
                }
            })
        
        conn.close()
        return jsonify({
            "success": True,
            "nrrqu": nrrqu,
            "serier": serier,
            "filial": filial,
            "totalComponentes": len(componentes),
            "componentes": componentes
        })
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
        
        # =====================================================
        # NOVA LÓGICA DE BUSCA DE ITENS (v6 - FC12111)
        # 
        # Usa FC12110 com LEFT JOIN em FC03140 para obter lote/datas
        # diretamente do lote registrado na requisição.
        # 
        # Para identificar KITs: usa FC12111 (explosão do kit na requisição)
        # - Se existe registro em FC12111 para (NRRQU, SERIER, CDFIL) → é KIT
        # - Os componentes são buscados diretamente da FC12111
        # =====================================================
        
        # 1. Descobre colunas das tabelas relevantes
        
        # FC03140 - lotes e datas
        colunas_fc03140 = []
        try:
            cursor.execute("""
                SELECT TRIM(RDB$FIELD_NAME) 
                FROM RDB$RELATION_FIELDS 
                WHERE RDB$RELATION_NAME = 'FC03140'
            """)
            colunas_fc03140 = [row[0] for row in cursor.fetchall()]
            print(f"[DEBUG] Colunas FC03140: {colunas_fc03140}")
        except Exception as e:
            print(f"[DEBUG] Erro ao listar colunas FC03140: {e}")
        
        # FC03000 - produtos
        colunas_fc03000 = []
        try:
            cursor.execute("""
                SELECT TRIM(RDB$FIELD_NAME) 
                FROM RDB$RELATION_FIELDS 
                WHERE RDB$RELATION_NAME = 'FC03000'
            """)
            colunas_fc03000 = [row[0] for row in cursor.fetchall()]
            print(f"[DEBUG] Colunas FC03000: {colunas_fc03000[:10]}...")
        except Exception as e:
            print(f"[DEBUG] Erro ao listar colunas FC03000: {e}")
        
        # FC12111 - explosão de KITs na requisição
        colunas_fc12111 = []
        try:
            cursor.execute("""
                SELECT TRIM(RDB$FIELD_NAME) 
                FROM RDB$RELATION_FIELDS 
                WHERE RDB$RELATION_NAME = 'FC12111'
            """)
            colunas_fc12111 = [row[0] for row in cursor.fetchall()]
            print(f"[DEBUG] Colunas FC12111: {colunas_fc12111}")
        except Exception as e:
            print(f"[DEBUG] Erro ao listar colunas FC12111: {e}")
        
        # Verifica se NOMRED existe na FC03000
        tem_nomred = 'NOMRED' in colunas_fc03000
        select_nomred = "p.NOMRED" if tem_nomred else "NULL as NOMRED"
        
        # Verifica se FC12111 tem campos de lote
        fc12111_tem_lote = 'NRLOT' in colunas_fc12111 or 'CTLOT' in colunas_fc12111
        print(f"[DEBUG] FC12111 tem campos de lote: {fc12111_tem_lote}")
        
        # Identifica coluna de lote na FC03140
        col_lote_fc03140 = None
        for col in ['NRLOT', 'CTLOT', 'LOTE']:
            if col in colunas_fc03140:
                col_lote_fc03140 = col
                break
        
        # Identifica colunas de data na FC03140
        col_fab = 'DTFAB' if 'DTFAB' in colunas_fc03140 else None
        col_val = 'DTVAL' if 'DTVAL' in colunas_fc03140 else None
        
        print(f"[DEBUG] FC03140 mapeamento: lote={col_lote_fc03140}, fab={col_fab}, val={col_val}")
        print(f"[DEBUG] FC03000 tem NOMRED: {tem_nomred}")
        
        # =====================================================
        # 2. NOVA FUNÇÃO: Verificar se é KIT via FC12111
        # A regra é simples: se existe registro em FC12111 → é KIT
        # =====================================================
        def verificar_kit_fc12111(nrrqu, serier, cdfil):
            """
            Verifica se um item é KIT consultando a FC12111.
            Retorna True se existir registro (é KIT), False caso contrário.
            """
            try:
                # Converte para inteiros para evitar erro de conversão de tipo
                nrrqu_int = int(nrrqu)
                serier_int = int(serier)
                cdfil_int = int(cdfil)
                
                cursor.execute("""
                    SELECT COUNT(*) FROM FC12111 
                    WHERE NRRQU = ? AND SERIER = ? AND CDFIL = ?
                """, (nrrqu_int, serier_int, cdfil_int))
                row = cursor.fetchone()
                count = row[0] if row else 0
                print(f"[DEBUG] FC12111 count para NRRQU={nrrqu_int}, SERIER={serier_int}: {count}")
                return count > 0
            except Exception as e:
                print(f"[DEBUG] Erro ao verificar FC12111: {e}")
                return False
        
        # =====================================================
        # 3. NOVA FUNÇÃO: Buscar componentes do KIT via FC12111
        # =====================================================
        def buscar_componentes_kit_fc12111(nrrqu, serier, cdfil):
            """
            Busca os componentes de um KIT diretamente da FC12111.
            Retorna lista de dicts com cdpro, nome, etc.
            """
            componentes = []
            
            # Monta SELECT dinamicamente baseado nas colunas disponíveis
            select_cols = ['c.CDPRO']
            
            if 'CDPRIN' in colunas_fc12111:
                select_cols.append('c.CDPRIN')
            else:
                select_cols.append('NULL as CDPRIN')
                
            if 'QUANT' in colunas_fc12111:
                select_cols.append('c.QUANT')
            else:
                select_cols.append('NULL as QUANT')
                
            if 'UNIDADE' in colunas_fc12111:
                select_cols.append('c.UNIDADE')
            elif 'UNIDA' in colunas_fc12111:
                select_cols.append('c.UNIDA as UNIDADE')
            else:
                select_cols.append('NULL as UNIDADE')
            
            if 'ORDCAP' in colunas_fc12111:
                select_cols.append('c.ORDCAP')
            else:
                select_cols.append('NULL as ORDCAP')
            
            if 'TPCMP' in colunas_fc12111:
                select_cols.append('c.TPCMP')
            else:
                select_cols.append('NULL as TPCMP')
            
            # Campos de lote na FC12111 (Estratégia A)
            if 'NRLOT' in colunas_fc12111:
                select_cols.append('c.NRLOT')
            else:
                select_cols.append('NULL as NRLOT')
                
            if 'CTLOT' in colunas_fc12111:
                select_cols.append('c.CTLOT')
            else:
                select_cols.append('NULL as CTLOT')
            
            select_str = ', '.join(select_cols)
            
            # Determina ORDER BY
            order_by = 'c.ORDCAP' if 'ORDCAP' in colunas_fc12111 else 'c.CDPRO'
            
            try:
                # Converte para inteiros para evitar erro de conversão de tipo
                nrrqu_int = int(nrrqu)
                serier_int = int(serier)
                cdfil_int = int(cdfil)
                
                query = f"""
                    SELECT {select_str}, p.DESCR
                    FROM FC12111 c
                    LEFT JOIN FC03000 p ON p.CDPRO = c.CDPRO
                    WHERE c.NRRQU = ? AND c.SERIER = ? AND c.CDFIL = ?
                    ORDER BY {order_by}
                """
                print(f"[DEBUG] Query FC12111: {query.strip()[:200]}...")
                cursor.execute(query, (nrrqu_int, serier_int, cdfil_int))
                
                rows = cursor.fetchall()
                for row in rows:
                    componentes.append({
                        'cdpro': row[0],
                        'cdprin': row[1],
                        'quant': row[2],
                        'unidade': row[3],
                        'ordcap': row[4],
                        'tpcmp': row[5],
                        'nrlot': str(row[6]).strip() if row[6] else '',
                        'ctlot': str(row[7]).strip() if row[7] else '',
                        'nome': (row[8] or '').strip() if row[8] else ''
                    })
                
                print(f"[DEBUG] FC12111 retornou {len(componentes)} componentes")
                for comp in componentes:
                    print(f"  -> CDPRO={comp['cdpro']}, NOME={comp['nome'][:30] if comp['nome'] else 'N/A'}, NRLOT={comp['nrlot']}, CTLOT={comp['ctlot']}")
                    
            except Exception as e:
                print(f"[DEBUG] Erro ao buscar componentes FC12111: {e}")
            
            return componentes
        
        # =====================================================
        # 4. NOVA FUNÇÃO: Buscar lote de componente (A ou B)
        # Estratégia A: Usa lote da própria FC12111
        # Estratégia B: Busca lote mais recente na FC03140
        # =====================================================
        def buscar_lote_componente(cdpro_comp, nrlot_fc12111, ctlot_fc12111, cdfil):
            """
            Busca lote/fabricação/validade de um componente.
            Retorna (lote, dtfab, dtval, estrategia)
            """
            lote_usado = nrlot_fc12111 or ctlot_fc12111
            
            # ESTRATÉGIA A: Se FC12111 tem lote, busca na FC03140 com esse lote
            if lote_usado and col_lote_fc03140:
                try:
                    select_fab = f"l.{col_fab}" if col_fab else "NULL"
                    select_val = f"l.{col_val}" if col_val else "NULL"
                    
                    cursor.execute(f"""
                        SELECT l.{col_lote_fc03140}, {select_fab}, {select_val}
                        FROM FC03140 l
                        WHERE l.CDPRO = ? AND l.CDFIL = ? 
                          AND (l.{col_lote_fc03140} = ? OR l.{col_lote_fc03140} = ?)
                    """, (cdpro_comp, cdfil, nrlot_fc12111 or '', ctlot_fc12111 or ''))
                    row = cursor.fetchone()
                    
                    if row:
                        return str(row[0]).strip() if row[0] else '', row[1], row[2], 'A'
                except Exception as e:
                    print(f"[DEBUG] Erro Estratégia A para CDPRO={cdpro_comp}: {e}")
            
            # ESTRATÉGIA B: Busca lote mais recente na FC03140
            if col_lote_fc03140 and col_val:
                try:
                    select_fab = f"l.{col_fab}" if col_fab else "NULL"
                    select_val = f"l.{col_val}" if col_val else "NULL"
                    
                    cursor.execute(f"""
                        SELECT FIRST 1 l.{col_lote_fc03140}, {select_fab}, {select_val}
                        FROM FC03140 l
                        WHERE l.CDPRO = ? AND l.CDFIL = ?
                        ORDER BY l.{col_val} DESC
                    """, (cdpro_comp, cdfil))
                    row = cursor.fetchone()
                    
                    if row:
                        return str(row[0]).strip() if row[0] else '', row[1], row[2], 'B'
                except Exception as e:
                    print(f"[DEBUG] Erro Estratégia B para CDPRO={cdpro_comp}: {e}")
            
            # Fallback: retorna lote da FC12111 sem datas
            return lote_usado or '', None, None, 'X'
        
        # 2. Monta query principal com LEFT JOIN dinâmico
        # Busca itens da requisição com dados do produto e lote
        if col_lote_fc03140 and (col_fab or col_val):
            # FC03140 disponível com lote e datas
            select_datas = f"l.{col_fab}" if col_fab else "NULL"
            select_val = f"l.{col_val}" if col_val else "NULL"
            
            # IMPORTANTE: Busca TODOS os itens da requisição SEM filtro TPCMP
            # para garantir que todos os componentes de kit sejam retornados
            query_itens = f"""
                SELECT 
                    i.SERIER,
                    i.ITEMID,
                    i.CDPRO,
                    i.CDPRIN,
                    i.DESCR,
                    i.QUANT,
                    i.UNIDA,
                    i.NRLOT,
                    i.CTLOT,
                    p.DESCR as DESCR_PROD,
                    {select_nomred},
                    {select_datas} as DTFAB,
                    {select_val} as DTVAL
                FROM FC12110 i
                LEFT JOIN FC03000 p ON p.CDPRO = i.CDPRO
                LEFT JOIN FC03140 l ON l.CDPRO = i.CDPRO 
                    AND (l.{col_lote_fc03140} = i.NRLOT OR l.{col_lote_fc03140} = i.CTLOT)
                WHERE i.NRRQU = ? AND i.CDFIL = ?
                ORDER BY i.SERIER, i.ITEMID
            """
        else:
            # Fallback sem FC03140
            # IMPORTANTE: Busca TODOS os itens SEM filtro TPCMP
            query_itens = f"""
                SELECT 
                    i.SERIER,
                    i.ITEMID,
                    i.CDPRO,
                    i.CDPRIN,
                    i.DESCR,
                    i.QUANT,
                    i.UNIDA,
                    i.NRLOT,
                    i.CTLOT,
                    p.DESCR as DESCR_PROD,
                    {select_nomred},
                    NULL as DTFAB,
                    NULL as DTVAL
                FROM FC12110 i
                LEFT JOIN FC03000 p ON p.CDPRO = i.CDPRO
                WHERE i.NRRQU = ? AND i.CDFIL = ?
                ORDER BY i.SERIER, i.ITEMID
            """
        
        print(f"[DEBUG] Query itens: {query_itens.strip()[:200]}...")
        cursor.execute(query_itens, (nr_requisicao, filial))
        
        itens_raw = cursor.fetchall()
        print(f"[DEBUG] {len(itens_raw)} itens encontrados para requisição {nr_requisicao}")
        
        # 3. Agrupa itens por SERIER para identificar KITs
        # Se múltiplos itens têm o mesmo SERIER, é um KIT
        from collections import defaultdict
        itens_por_serier = defaultdict(list)
        
        for row in itens_raw:
            serier = row[0]
            itemid = row[1]
            cdpro = row[2]
            cdprin = row[3]
            descr = row[4]
            quant = row[5]
            unida = row[6]
            nrlot = row[7]
            ctlot = row[8]
            descr_prod = row[9]
            nomred = row[10]
            dtfab = row[11]
            dtval = row[12]
            
            itens_por_serier[serier].append({
                'serier': serier,
                'itemid': itemid,
                'cdpro': cdpro,
                'cdprin': cdprin,
                'descr': descr or descr_prod or '',
                'quant': quant,
                'unida': unida,
                'nrlot': str(nrlot).strip() if nrlot else '',
                'ctlot': str(ctlot).strip() if ctlot else '',
                'nomred': nomred or '',
                'dtfab': dtfab,
                'dtval': dtval,
            })
        
        print(f"[DEBUG] {len(itens_por_serier)} grupos por SERIER")
        for serier, items in itens_por_serier.items():
            print(f"  SERIER={serier}: {len(items)} item(s)")
        
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
        
        # =====================================================
        # 4. PROCESSA CADA GRUPO POR SERIER
        # NOVA LÓGICA: Verifica se é KIT via FC12111 (fonte definitiva)
        # =====================================================
        data = []
        
        for serier in sorted(itens_por_serier.keys()):
            items_grupo = itens_por_serier[serier]
            
            # Pega o primeiro item do grupo para análise
            item_principal = items_grupo[0]
            cdpro_principal = item_principal['cdpro']
            descr_principal = item_principal['descr']
            
            print(f"\n{'='*60}")
            print(f"[DEBUG] SERIER={serier} CDPRO_PAI={cdpro_principal}")
            print(f"  DESCR: {descr_principal}")
            
            # =====================================================
            # NOVA LÓGICA: Verifica se é KIT via FC12111
            # A regra definitiva: se existe FC12111 → é KIT
            # =====================================================
            e_kit = verificar_kit_fc12111(nr_requisicao, serier, filial)
            
            if e_kit:
                print(f"[DEBUG] FC12111 count>0 => KIT")
                
                # Busca componentes diretamente da FC12111
                componentes_fc12111 = buscar_componentes_kit_fc12111(nr_requisicao, serier, filial)
                
                if componentes_fc12111:
                    # =====================================================
                    # É KIT: Monta rótulo com componentes da FC12111
                    # =====================================================
                    nome_kit = descr_principal
                    
                    # Monta lista de componentes formatada
                    componentes_kit = []
                    
                    for comp_info in componentes_fc12111:
                        cdpro_comp = comp_info['cdpro']
                        nome_comp = comp_info['nome'] or f"COMP-{cdpro_comp}"
                        
                        # Remove prefixos do nome
                        nome_upper = nome_comp.upper()
                        for prefixo in ['AMP ', 'CX ', 'KIT ', 'FRS ']:
                            if nome_upper.startswith(prefixo):
                                nome_comp = nome_comp[len(prefixo):]
                                break
                        
                        # Busca lote e datas usando a nova função com estratégias A/B
                        lote, dtfab, dtval, estrategia = buscar_lote_componente(
                            cdpro_comp, 
                            comp_info['nrlot'], 
                            comp_info['ctlot'],
                            filial
                        )
                        
                        # Formata datas
                        fab_str = ""
                        val_str = ""
                        if dtfab:
                            try:
                                fab_str = dtfab.strftime('%m/%y')
                            except:
                                fab_str = str(dtfab)
                        if dtval:
                            try:
                                val_str = dtval.strftime('%m/%y')
                            except:
                                val_str = str(dtval)
                        
                        componentes_kit.append({
                            "codigo": str(cdpro_comp),
                            "nome": nome_comp.upper(),
                            "ph": "",  # pH será preenchido manualmente
                            "lote": lote,
                            "fabricacao": fab_str,
                            "validade": val_str
                        })
                        print(f"[DEBUG] comp {cdpro_comp} lote={lote} fab={fab_str} val={val_str} ({estrategia})")
                    
                    # Usa dados do primeiro item para o rótulo
                    rotulo = {
                        **dados_base,
                        "nrItem": str(serier),
                        "formula": simplificar_nome_mescla(nome_kit),
                        "volume": str(item_principal['quant']) if item_principal['quant'] else dados_base["volume"],
                        "unidadeVolume": item_principal['unida'] or dados_base["unidadeVolume"],
                        "lote": "",  # KIT não tem lote único - cada componente tem o seu
                        "quantidade": str(int(item_principal['quant'])) if item_principal['quant'] else "",
                        "composicao": "",
                        "aplicacao": "",
                        "descricaoProduto": nome_kit,
                        "observacoes": "",
                        "tipoItem": "KIT",
                        "componentes": componentes_kit
                    }
                    
                    print(f"[DEBUG] Rótulo KIT montado com {len(componentes_kit)} componentes")
                    data.append(rotulo)
                    continue  # Próximo SERIER
                else:
                    # FC12111 existe mas não retornou componentes - fallback
                    print(f"[DEBUG] FC12111 indicou KIT mas não retornou componentes - tratando como KIT vazio")
                    rotulo = {
                        **dados_base,
                        "nrItem": str(serier),
                        "formula": simplificar_nome_mescla(descr_principal),
                        "volume": str(item_principal['quant']) if item_principal['quant'] else dados_base["volume"],
                        "unidadeVolume": item_principal['unida'] or dados_base["unidadeVolume"],
                        "lote": item_principal['nrlot'] or item_principal['ctlot'] or '',
                        "quantidade": str(int(item_principal['quant'])) if item_principal['quant'] else "",
                        "composicao": "",
                        "aplicacao": "",
                        "descricaoProduto": descr_principal,
                        "observacoes": "",
                        "tipoItem": "KIT",
                        "componentes": []
                    }
                    data.append(rotulo)
                    continue
            
            else:
                print(f"[DEBUG] FC12111 count=0 => NAO E KIT")
                # =====================================================
                # ITEM ÚNICO: Processa normalmente
                # =====================================================
                item = items_grupo[0]
                cdpro = item['cdpro']
                cdprin = item['cdprin']
                nome_produto = item['descr']
                item_id = item['itemid']
                
                print(f"  CDPRO: '{cdpro}'")
                print(f"  CDPRIN: '{cdprin}'")
                print(f"  NOME PRODUTO: '{nome_produto}'")
                
                # Determina qual código usar para buscar composição
                cdprin_str = str(cdprin).strip() if cdprin else ""
                cdpro_str = str(cdpro).strip()
                
                if cdprin_str and cdprin_str != cdpro_str and cdprin_str != '0':
                    codigo_busca = cdprin_str
                    print(f"  -> USANDO CDPRIN ({cdprin_str}) para buscar composição")
                else:
                    codigo_busca = cdpro_str
                    print(f"  -> USANDO CDPRO ({cdpro_str}) para buscar composição")
                
                codigo_busca_padded = codigo_busca.zfill(8)
                
                # Query FC99999 para composição
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
                
                todos_args = todos_args_exato
                
                # Se não encontrou com exato, tenta CONTAINING
                if not todos_args:
                    cursor.execute("""
                        SELECT ARGUMENTO, SUBARGUM, PARAMETRO 
                        FROM FC99999 
                        WHERE ARGUMENTO CONTAINING ?
                        ORDER BY ARGUMENTO, SUBARGUM
                    """, (codigo_busca,))
                    todos_args_containing = cursor.fetchall()
                    
                    for arg in todos_args_containing:
                        argumento = arg[0].strip() if arg[0] else ""
                        codigo_no_arg = argumento.replace("OBSFIC", "").strip()
                        
                        if (codigo_busca in codigo_no_arg or 
                            codigo_busca_padded in codigo_no_arg or
                            argumento.endswith(codigo_busca) or 
                            argumento.endswith(codigo_busca_padded)):
                            todos_args.append(arg)
                
                # Processa registros encontrados
                ativos_mescla = []
                aplicacao_fc99999 = ""
                IGNORAR_ATIVOS = ['ETIQUETA', 'CATALOGO', 'PREGA', 'SUG.', 'SUGESTAO', 'CATÁLOGO', 'INSTRUC', 'AVISO']
                
                for arg in todos_args:
                    texto = arg[2]
                    if texto and hasattr(texto, 'read'):
                        texto = texto.read().decode('latin-1')
                    texto = texto.strip() if texto else ""
                    
                    if not texto:
                        continue
                    
                    texto_upper = texto.upper()
                    
                    if "APLICA" in texto_upper and ":" in texto:
                        aplicacao_fc99999 = texto.split(":", 1)[1].strip()
                        continue
                    
                    if any(ignorar in texto_upper for ignorar in IGNORAR_ATIVOS):
                        continue
                    
                    if len(texto) > 200 and ',' not in texto:
                        continue
                    
                    texto_limpo = texto
                    if texto_upper.startswith("OBS:"):
                        texto_limpo = texto[4:].strip()
                    elif texto_upper.startswith("OBS :"):
                        texto_limpo = texto[5:].strip()
                    
                    if texto_limpo.strip():
                        ativos_mescla.append(texto_limpo)
                
                # Determina se é MESCLA
                nome_produto_upper = nome_produto.upper() if nome_produto else ""
                e_mescla = False
                composicao = ""
                nome_formula = nome_produto
                
                if ativos_mescla:
                    primeiro_ativo = ativos_mescla[0]
                    
                    if cdprin_str and cdprin_str != cdpro_str and cdprin_str != '0':
                        e_mescla = True
                    elif ',' in primeiro_ativo:
                        e_mescla = True
                    elif primeiro_ativo and nome_produto_upper not in primeiro_ativo.upper():
                        palavras_produto = [p for p in nome_produto_upper.split() if len(p) > 3]
                        if not any(p in primeiro_ativo.upper() for p in palavras_produto[:2]):
                            e_mescla = True
                    
                    if e_mescla:
                        composicao = primeiro_ativo
                        nome_formula = nome_produto.replace("AMP ", "").strip() if nome_produto else ""
                
                # Busca aplicação na FC03300 se não encontrou na FC99999
                aplicacao = aplicacao_fc99999
                descricao_produto = ""
                
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
                            aplicacao = texto[10:].strip()
                        elif cdicp == '00004' and not descricao_produto:
                            descricao_produto = texto
                
                # Limpa aplicação se for muito longa
                if len(aplicacao) > 30 or ',' in aplicacao:
                    aplicacao = ""
                
                # Formata datas do item
                fab_str = ""
                val_str = ""
                if item['dtfab']:
                    try:
                        fab_str = item['dtfab'].strftime('%d/%m/%Y')
                    except:
                        fab_str = str(item['dtfab'])
                if item['dtval']:
                    try:
                        val_str = item['dtval'].strftime('%d/%m/%Y')
                    except:
                        val_str = str(item['dtval'])
                
                # Se não tem datas do lote, usa as datas base da requisição
                if not fab_str:
                    fab_str = dados_base.get("dataFabricacao", "")
                if not val_str:
                    val_str = dados_base.get("dataValidade", "")
                
                tipo_item = "MESCLA" if e_mescla else "PRODUTO ÚNICO"
                
                rotulo = {
                    **dados_base,
                    "nrItem": str(serier),
                    "formula": nome_formula,
                    "volume": str(item['quant']) if item['quant'] else dados_base["volume"],
                    "unidadeVolume": item['unida'] or dados_base["unidadeVolume"],
                    "lote": item['nrlot'] or item['ctlot'] or '',
                    "quantidade": str(int(item['quant'])) if item['quant'] else "",
                    "composicao": composicao,
                    "aplicacao": aplicacao,
                    "descricaoProduto": descricao_produto,
                    "observacoes": composicao,
                    "tipoItem": tipo_item,
                    "dataFabricacao": fab_str,
                    "dataValidade": val_str,
                }
                
                print(f"  -> TIPO: {tipo_item}")
                data.append(rotulo)
        
        conn.close()
        
        if not data:
            data = [{**dados_base, "nrItem": "0", "formula": "", "lote": "", "quantidade": "", "observacoes": "", "composicao": "", "aplicacao": "", "descricaoProduto": ""}]
        
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



# ============================================
# ENDPOINT: Buscar ROTUTX raw do Fórmula Certa e enviar via /raw para o agente
# ============================================
@app.route('/api/rotutx-raw', methods=['POST'])
def rotutx_raw():
    """Busca os bytes RAW do ROTUTX (FC12300) e retorna em base64.
    Este é o dado EXATO que o Fórmula Certa envia para a impressora."""
    
    
    data = request.get_json() or {}
    nr_req = data.get('req')
    serie = data.get('serie', '01')
    
    if not nr_req:
        return jsonify({"success": False, "error": "Parâmetro 'req' obrigatório"}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Buscar ROTUTX raw (BLOB) da FC12300
        cursor.execute("""
            SELECT ROTUTX, TPMODELO, SERIER
            FROM FC12300
            WHERE NRRQU = ? AND SERIER = ?
        """, (int(nr_req), serie))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row:
            return jsonify({"success": False, "error": f"ROTUTX não encontrado para REQ {nr_req} SERIE {serie}"}), 404
        
        rotutx_blob = row[0]
        tp_modelo = row[1]
        serie_r = row[2]
        
        if not rotutx_blob:
            return jsonify({"success": False, "error": "ROTUTX está vazio (NULL)"}), 404
        
        # Converter BLOB para bytes
        if hasattr(rotutx_blob, 'read'):
            raw_bytes = rotutx_blob.read()
        elif isinstance(rotutx_blob, bytes):
            raw_bytes = rotutx_blob
        else:
            raw_bytes = bytes(rotutx_blob)
        
        # Encode em base64
        b64 = base64.b64encode(raw_bytes).decode('ascii')
        
        # Preview para debug
        try:
            preview = raw_bytes[:300].decode('latin-1', errors='ignore')
        except:
            preview = repr(raw_bytes[:100])
        
        return jsonify({
            "success": True,
            "dados_base64": b64,
            "tamanho_bytes": len(raw_bytes),
            "tipo_modelo": tp_modelo,
            "serie": serie_r,
            "preview": preview,
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


@app.route('/api/imprimir-fc-raw', methods=['POST'])
def imprimir_fc_raw():
    """Busca ROTUTX do banco e envia direto para o agente via /raw.
    Esta é a abordagem mais confiável: usa os MESMOS bytes que o Fórmula Certa gera."""
    
    
    data = request.get_json() or {}
    nr_req = data.get('req')
    serie = data.get('serie', '01')
    agente_url = data.get('agente_url', 'http://localhost:5001')
    impressora = data.get('impressora', 'AMP PEQUENO')
    
    if not nr_req:
        return jsonify({"success": False, "error": "Parâmetro 'req' obrigatório"}), 400
    
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        cursor.execute("""
            SELECT ROTUTX
            FROM FC12300
            WHERE NRRQU = ? AND SERIER = ?
        """, (int(nr_req), serie))
        
        row = cursor.fetchone()
        conn.close()
        
        if not row or not row[0]:
            return jsonify({"success": False, "error": f"ROTUTX não encontrado para REQ {nr_req}"}), 404
        
        rotutx_blob = row[0]
        if hasattr(rotutx_blob, 'read'):
            raw_bytes = rotutx_blob.read()
        elif isinstance(rotutx_blob, bytes):
            raw_bytes = rotutx_blob
        else:
            raw_bytes = bytes(rotutx_blob)
        
        b64 = base64.b64encode(raw_bytes).decode('ascii')
        
        # Enviar para o agente via /raw
        try:
            resp = http_requests.post(
                f"{agente_url}/raw",
                json={
                    "impressora": impressora,
                    "dados_base64": b64,
                },
                timeout=15
            )
            agent_result = resp.json()
        except Exception as agent_err:
            return jsonify({
                "success": False,
                "error": f"Erro ao enviar para agente: {str(agent_err)}",
                "dados_base64": b64,
                "tamanho": len(raw_bytes),
            }), 500
        
        return jsonify({
            "success": agent_result.get("success", False),
            "message": "ROTUTX enviado via /raw para o agente",
            "tamanho_bytes": len(raw_bytes),
            "agent_response": agent_result,
        })
        
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500


if __name__ == '__main__':
    print("=" * 50)
    print("Servidor iniciando na porta 5000...")
    print(f"Impressão disponível: {PRINTING_AVAILABLE}")
    print("Teste: http://localhost:5000/api/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
