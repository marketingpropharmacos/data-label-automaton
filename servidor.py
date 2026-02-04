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
        
        # Busca itens da requisição (fórmulas) - incluindo CDPRIN para buscar composição de mesclas
        # SERIER contém a sequência das barras (0, 1, 2...) conforme FórmulaCerta
        cursor.execute("""
            SELECT I.SERIER, I.DESCR, I.QUANT, I.UNIDA, I.NRLOT, I.CDPRO, I.CDPRIN, I.ITEMID
            FROM FC12110 I
            WHERE I.NRRQU = ? AND I.CDFIL = ? AND I.TPCMP IN ('C', 'S')
            ORDER BY I.SERIER
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
        
        # =====================================================
        # FUNÇÕES PARA DETECÇÃO DE KITS VIA FC12111 (NOVA LÓGICA)
        # 
        # FC12111 contém a "explosão" do kit na requisição.
        # Se existir registro em FC12111 para (NRRQU, SERIER, CDFIL),
        # o item é DEFINITIVAMENTE um KIT.
        #
        # FLUXO:
        # 1. Verificar COUNT(*) em FC12111 WHERE NRRQU/SERIER/CDFIL
        # 2. Se count > 0 → É KIT → busca componentes na mesma FC12111
        # 3. Para cada componente, busca lote/fab/val na FC03140
        # =====================================================
        
        def verificar_kit_fc12111(cursor, nrrqu, serier, cdfil):
            """
            Verifica se um item é KIT usando a tabela FC12111.
            Retorna True se existir registro, False caso contrário.
            """
            try:
                # Converte para int para evitar SQLCODE -413
                nrrqu_int = int(nrrqu)
                serier_int = int(serier)
                cdfil_int = int(cdfil)
                
                print(f"  [FC12111] Verificando KIT: NRRQU={nrrqu_int}, SERIER={serier_int}, CDFIL={cdfil_int}")
                
                cursor.execute("""
                    SELECT COUNT(*) FROM FC12111 
                    WHERE NRRQU = ? AND SERIER = ? AND CDFIL = ?
                """, (nrrqu_int, serier_int, cdfil_int))
                
                row = cursor.fetchone()
                count = row[0] if row else 0
                
                print(f"  [FC12111] count={count} => {'KIT' if count > 0 else 'NAO E KIT'}")
                return count > 0
                
            except Exception as e:
                print(f"  [FC12111 ERRO] {e}")
                return False
        
        def buscar_componentes_kit_fc12111(cursor, nrrqu, serier, cdfil):
            """
            Busca componentes de um KIT na FC12111.
            Retorna lista de dicts com código, nome, lote, fab, val.
            
            DESCOBERTA DINÂMICA:
            - FC03000.NOMRED pode não existir em alguns bancos
            - FC12111.NRLOT/CTLOT podem não existir em alguns bancos
            - Usa lote da FC12111 (requisição) quando disponível, senão fallback FC03140
            """
            componentes = []
            try:
                # Converte para int
                nrrqu_int = int(nrrqu)
                serier_int = int(serier)
                cdfil_int = int(cdfil)
                
                print(f"  [FC12111] Buscando componentes: NRRQU={nrrqu_int}, SERIER={serier_int}, CDFIL={cdfil_int}")
                
                # ========== DESCOBERTA DINÂMICA DE COLUNAS DA FC03000 ==========
                cursor.execute("""
                    SELECT TRIM(RDB$FIELD_NAME) 
                    FROM RDB$RELATION_FIELDS 
                    WHERE RDB$RELATION_NAME = 'FC03000'
                """)
                colunas_fc03000 = [row[0] for row in cursor.fetchall()]
                
                tem_nomred = 'NOMRED' in colunas_fc03000
                if not tem_nomred:
                    print(f"  [KIT] FC03000 sem NOMRED; usando NULL")
                
                # ========== DESCOBERTA DINÂMICA DE COLUNAS DA FC12111 ==========
                cursor.execute("""
                    SELECT TRIM(RDB$FIELD_NAME) 
                    FROM RDB$RELATION_FIELDS 
                    WHERE RDB$RELATION_NAME = 'FC12111'
                """)
                colunas_fc12111 = [row[0] for row in cursor.fetchall()]
                print(f"  [FC12111] Colunas disponíveis: {colunas_fc12111}")
                
                tem_nrlot = 'NRLOT' in colunas_fc12111
                tem_ctlot = 'CTLOT' in colunas_fc12111
                
                if not tem_nrlot and not tem_ctlot:
                    print(f"  [KIT] FC12111 sem campos de lote; usando fallback FC03140")
                
                # Identifica coluna de ordem
                col_ordem = None
                for col in ['ORDCAP', 'ITEMID', 'ORDEM', 'SEQUENCIA']:
                    if col in colunas_fc12111:
                        col_ordem = col
                        break
                
                order_clause = f"ORDER BY c.{col_ordem}" if col_ordem else ""
                
                # Monta SELECT dinâmico
                select_cols = ["c.CDPRO", "c.CDPRIN", "c.QUANT", "c.UNIDADE", "c.TPCMP", "p.DESCR"]
                
                if tem_nomred:
                    select_cols.append("p.NOMRED")
                else:
                    select_cols.append("NULL as NOMRED")
                
                if tem_nrlot:
                    select_cols.append("c.NRLOT")
                else:
                    select_cols.append("NULL as NRLOT")
                    
                if tem_ctlot:
                    select_cols.append("c.CTLOT")
                else:
                    select_cols.append("NULL as CTLOT")
                
                # Query para buscar componentes
                query = f"""
                    SELECT {', '.join(select_cols)}
                    FROM FC12111 c
                    LEFT JOIN FC03000 p ON c.CDPRO = p.CDPRO
                    WHERE c.NRRQU = ? AND c.SERIER = ? AND c.CDFIL = ?
                    {order_clause}
                """
                print(f"  [FC12111] Query: {query.strip()}")
                cursor.execute(query, (nrrqu_int, serier_int, cdfil_int))
                
                rows = cursor.fetchall()
                print(f"  [FC12111] {len(rows)} componentes encontrados")
                
                for row in rows:
                    # Índices: 0=CDPRO, 1=CDPRIN, 2=QUANT, 3=UNIDADE, 4=TPCMP, 5=DESCR, 6=NOMRED, 7=NRLOT, 8=CTLOT
                    cdpro_comp = row[0]
                    cdprin_comp = row[1]
                    quant_comp = row[2]
                    unida_comp = row[3]
                    tpcmp_comp = row[4]
                    descr = row[5] or ""
                    nomred = row[6] or ""
                    nrlot_fc12111 = row[7]
                    ctlot_fc12111 = row[8]
                    
                    # Nome: prioriza NOMRED, fallback DESCR
                    nome_comp = (nomred.strip() or descr.strip() or f"COMP_{cdpro_comp}")
                    
                    # Remove prefixos do nome (AMP, KIT, FRS)
                    nome_limpo = nome_comp.upper().strip()
                    for prefixo in ['AMP ', 'CX ', 'KIT ', 'FRS ']:
                        if nome_limpo.startswith(prefixo):
                            nome_limpo = nome_limpo[len(prefixo):]
                            break
                    
                    # Determina lote a usar (prioriza FC12111)
                    lote_usar = None
                    if nrlot_fc12111:
                        lote_usar = str(nrlot_fc12111).strip()
                    elif ctlot_fc12111:
                        lote_usar = str(ctlot_fc12111).strip()
                    
                    # Busca lote/fab/val para o componente
                    lote_str, fab_str, val_str = buscar_lote_componente(cursor, cdpro_comp, cdfil_int, lote_usar)
                    
                    print(f"    [COMP] CDPRO={cdpro_comp}, NOME={nome_limpo[:40]}, LT:{lote_str}, F:{fab_str}, V:{val_str}")
                    
                    componentes.append({
                        "codigo": str(cdpro_comp),
                        "nome": nome_limpo,
                        "ph": "",  # pH não está na FC12111, pode ser preenchido manualmente
                        "lote": lote_str,
                        "fabricacao": fab_str,
                        "validade": val_str
                    })
                    
            except Exception as e:
                print(f"  [FC12111 COMPONENTES ERRO] {e}")
                import traceback
                traceback.print_exc()
            
            return componentes
        
        def buscar_lote_componente(cursor, cdpro, cdfil, lote_usar=None):
            """
            Busca lote/fabricação/validade de um componente na FC03140.
            
            Estratégias:
            A) Se lote_usar fornecido (da FC12111): busca esse lote específico
            B) Fallback: busca o lote mais recente (ORDER BY DTVAL DESC)
            
            Retorna (lote, fabricacao, validade) como strings.
            """
            try:
                cdpro_int = int(cdpro) if cdpro else 0
                cdfil_int = int(cdfil)
                
                if lote_usar:
                    # ESTRATÉGIA A: Busca lote específico da requisição
                    cursor.execute("""
                        SELECT FIRST 1 NRLOT, CTLOT, DTFAB, DTVAL
                        FROM FC03140 
                        WHERE CDPRO = ? AND CDFIL = ?
                          AND (CAST(NRLOT AS VARCHAR(50)) = ? OR CAST(CTLOT AS VARCHAR(50)) = ?)
                        ORDER BY DTVAL DESC
                    """, (cdpro_int, cdfil_int, lote_usar, lote_usar))
                    
                    row = cursor.fetchone()
                    if row:
                        lote = str(row[0] or row[1] or lote_usar).strip()
                        fab = row[2].strftime('%m/%y') if row[2] else ""
                        val = row[3].strftime('%m/%y') if row[3] else ""
                        print(f"      [LOTE] Encontrado via FC12111: {lote} (A)")
                        return (lote, fab, val)
                    else:
                        # Não achou o lote específico, usa o lote_usar sem datas
                        print(f"      [LOTE] Lote {lote_usar} não encontrado na FC03140, usando sem datas")
                        return (lote_usar, "", "")
                
                # ESTRATÉGIA B: Fallback - busca lote mais recente
                cursor.execute("""
                    SELECT FIRST 1 NRLOT, CTLOT, DTFAB, DTVAL
                    FROM FC03140 
                    WHERE CDPRO = ? AND CDFIL = ?
                    ORDER BY DTVAL DESC
                """, (cdpro_int, cdfil_int))
                
                row = cursor.fetchone()
                if row:
                    lote = str(row[0] or row[1] or "").strip()
                    fab = row[2].strftime('%m/%y') if row[2] else ""
                    val = row[3].strftime('%m/%y') if row[3] else ""
                    print(f"      [LOTE] Encontrado via fallback FC03140: {lote} (B)")
                    return (lote, fab, val)
                    
            except Exception as e:
                print(f"      [LOTE ERRO] CDPRO={cdpro}: {e}")
            
            return ("", "", "")
        
        # =====================================================
        # FUNÇÕES LEGADAS PARA DETECÇÃO DE KITS (FC05000/FC05100)
        # Mantidas como fallback caso FC12111 não funcione
        # =====================================================
        
        def buscar_cdfrm_do_kit(cursor, cdpro):
            """
            Descobre o código do kit (CDFRM) a partir do CDPRO do produto.
            Usa descoberta dinâmica de colunas para evitar erros de 'Column unknown'.
            Retorna o CDFRM se for um kit, None caso contrário.
            
            CORREÇÃO v4: Descoberta dinâmica de colunas + todas estratégias.
            """
            cdpro_str = str(cdpro).strip()
            
            print(f"\n  ========== BUSCA KIT PARA CDPRO={cdpro_str} (fallback) ==========")
            
            try:
                # ========== DESCOBERTA DINÂMICA DE COLUNAS DA FC05000 ==========
                cursor.execute("""
                    SELECT TRIM(RDB$FIELD_NAME) 
                    FROM RDB$RELATION_FIELDS 
                    WHERE RDB$RELATION_NAME = 'FC05000'
                """)
                colunas_fc05000 = [row[0] for row in cursor.fetchall()]
                print(f"  [KIT] Colunas FC05000: {colunas_fc05000[:10]}...")
                
                # Identifica coluna do produto semi-acabado
                col_semi = None
                for col in ['CDSEM', 'CDPRO', 'CDSEMI', 'CDPRODUTO', 'CDPROSEM']:
                    if col in colunas_fc05000:
                        col_semi = col
                        break
                
                print(f"  [KIT] Coluna semi-acabado encontrada: {col_semi or 'NENHUMA'}")
                
                # ESTRATÉGIA 1: col_semi = CDPRO (string) - só se coluna existir
                if col_semi:
                    print(f"  [KIT] Estratégia 1: FC05000 WHERE {col_semi} = '{cdpro_str}'")
                    cursor.execute(f"""
                        SELECT CDFRM, {col_semi} FROM FC05000 
                        WHERE {col_semi} = ?
                    """, (cdpro_str,))
                    row = cursor.fetchone()
                    if row:
                        cdfrm = row[0]
                        print(f"  [KIT] ✓ ENCONTRADO! CDFRM={cdfrm}, {col_semi}={row[1]}")
                        return cdfrm
                    print(f"  [KIT] ✗ Não encontrado")
                    
                    # ESTRATÉGIA 2: col_semi = CDPRO (numérico)
                    try:
                        cdpro_int = int(cdpro_str)
                        print(f"  [KIT] Estratégia 2: FC05000 WHERE {col_semi} = {cdpro_int} (int)")
                        cursor.execute(f"""
                            SELECT CDFRM, {col_semi} FROM FC05000 
                            WHERE {col_semi} = ?
                        """, (cdpro_int,))
                        row = cursor.fetchone()
                        if row:
                            cdfrm = row[0]
                            print(f"  [KIT] ✓ ENCONTRADO! CDFRM={cdfrm}, {col_semi}={row[1]}")
                            return cdfrm
                        print(f"  [KIT] ✗ Não encontrado")
                    except ValueError:
                        pass
                
                # ESTRATÉGIA 3: CDFRM = CDPRO (talvez o CDPRO JÁ seja o código do kit)
                if 'CDFRM' in colunas_fc05000:
                    print(f"  [KIT] Estratégia 3: FC05000 WHERE CDFRM = '{cdpro_str}'")
                    cursor.execute("""
                        SELECT CDFRM FROM FC05000 
                        WHERE CDFRM = ?
                    """, (cdpro_str,))
                    row = cursor.fetchone()
                    if row:
                        cdfrm = row[0]
                        print(f"  [KIT] ✓ ENCONTRADO! CDFRM={cdfrm} (CDPRO é o próprio código do kit)")
                        return cdfrm
                    print(f"  [KIT] ✗ Não encontrado")
                    
                    # ESTRATÉGIA 4: CDFRM = CDPRO (numérico)
                    try:
                        cdpro_int = int(cdpro_str)
                        print(f"  [KIT] Estratégia 4: FC05000 WHERE CDFRM = {cdpro_int} (int)")
                        cursor.execute("""
                            SELECT CDFRM FROM FC05000 
                            WHERE CDFRM = ?
                        """, (cdpro_int,))
                        row = cursor.fetchone()
                        if row:
                            cdfrm = row[0]
                            print(f"  [KIT] ✓ ENCONTRADO! CDFRM={cdfrm}")
                            return cdfrm
                        print(f"  [KIT] ✗ Não encontrado")
                    except ValueError:
                        pass
                
                # ESTRATÉGIA 5: Busca direta na FC05100 (CDSAC = CDPRO)
                print(f"  [KIT] Estratégia 5: FC05100 WHERE CDSAC = '{cdpro_str}' (componente)")
                cursor.execute("""
                    SELECT CDFRM, CDSAC FROM FC05100 
                    WHERE CDSAC = ?
                """, (cdpro_str,))
                row = cursor.fetchone()
                if row:
                    cdfrm = row[0]
                    print(f"  [KIT] ✓ ENCONTRADO via FC05100! CDFRM={cdfrm} (CDPRO é componente)")
                    return cdfrm
                print(f"  [KIT] ✗ Não encontrado")
                
                # ESTRATÉGIA 6: Verifica se o nome do produto contém "KIT"
                print(f"  [KIT] Estratégia 6: Verificando nome do produto na FC03000")
                # Descoberta dinâmica de colunas da FC03000
                cursor.execute("""
                    SELECT TRIM(RDB$FIELD_NAME) 
                    FROM RDB$RELATION_FIELDS 
                    WHERE RDB$RELATION_NAME = 'FC03000'
                """)
                colunas_fc03000 = [row[0] for row in cursor.fetchall()]
                
                col_descr = 'DESCR' if 'DESCR' in colunas_fc03000 else None
                col_nomred = 'NOMRED' if 'NOMRED' in colunas_fc03000 else None
                
                if col_descr:
                    if col_nomred:
                        cursor.execute(f"SELECT {col_descr}, {col_nomred} FROM FC03000 WHERE CDPRO = ?", (cdpro_str,))
                    else:
                        cursor.execute(f"SELECT {col_descr}, '' FROM FC03000 WHERE CDPRO = ?", (cdpro_str,))
                    row = cursor.fetchone()
                    if row:
                        descr = (row[0] or "").upper()
                        nomred = (row[1] or "").upper()
                        print(f"  [KIT] Produto: DESCR='{descr[:50]}', NOMRED='{nomred}'")
                        if "KIT" in descr or "KIT" in nomred:
                            print(f"  [KIT] Nome contém 'KIT', buscando componentes diretamente...")
                            # Tenta buscar como se o CDPRO fosse o CDFRM
                            cursor.execute("""
                                SELECT COUNT(*) FROM FC05100 WHERE CDFRM = ?
                            """, (cdpro_str,))
                            count_row = cursor.fetchone()
                            if count_row and count_row[0] > 0:
                                print(f"  [KIT] ✓ {count_row[0]} componentes encontrados na FC05100!")
                                return cdpro_str  # O próprio CDPRO é o CDFRM
                            
                            # Tenta numérico
                            try:
                                cdpro_int = int(cdpro_str)
                                cursor.execute("""
                                    SELECT COUNT(*) FROM FC05100 WHERE CDFRM = ?
                                """, (cdpro_int,))
                                count_row = cursor.fetchone()
                                if count_row and count_row[0] > 0:
                                    print(f"  [KIT] ✓ {count_row[0]} componentes encontrados na FC05100 (int)!")
                                    return cdpro_int
                            except ValueError:
                                pass
                
                print(f"  [KIT] ========== NENHUMA ESTRATÉGIA FUNCIONOU ==========\n")
                return None
                
            except Exception as e:
                print(f"  [KIT ERRO GERAL] {e}")
                import traceback
                traceback.print_exc()
                return None
        
        def verificar_se_kit(cursor, cdpro):
            """
            Verifica se um produto é um KIT.
            Primeiro busca o CDFRM na FC05000 (via CDSEM = CDPRO).
            Retorna (True, CDFRM) se for kit, (False, None) caso contrário.
            """
            cdfrm = buscar_cdfrm_do_kit(cursor, cdpro)
            if cdfrm:
                return (True, cdfrm)
            return (False, None)
        
        def buscar_componentes_kit_fc05100(cursor, cdfrm, cdfil):
            """
            Busca componentes de um kit na FC05100.
            CDFRM = código do kit (obtido da FC05000)
            CDSAC = código de cada componente
            Para cada componente, busca nome na FC03000 e metadados via LEFT JOIN na FC03140.
            Lote/fabricação/validade são OPCIONAIS (LEFT JOIN para evitar erro 500).
            """
            componentes = []
            try:
                print(f"  [KIT FC05100] Buscando componentes para CDFRM={cdfrm}")
                
                # 1. Descobre colunas reais da FC05100
                cursor.execute("""
                    SELECT TRIM(RDB$FIELD_NAME) 
                    FROM RDB$RELATION_FIELDS 
                    WHERE RDB$RELATION_NAME = 'FC05100'
                """)
                colunas_fc05100 = [row[0] for row in cursor.fetchall()]
                print(f"  [KIT FC05100] Colunas disponíveis: {colunas_fc05100}")
                
                # 2. Identifica coluna do componente (código do produto)
                col_componente = None
                for col in ['CDSAC', 'CDPRO', 'CDCOMP', 'CDPRODUTO']:
                    if col in colunas_fc05100:
                        col_componente = col
                        break
                
                # 3. Identifica coluna da fórmula (vínculo com FC05000)
                col_formula = None
                for col in ['CDFRM', 'CDFORMULA', 'CDKIT']:
                    if col in colunas_fc05100:
                        col_formula = col
                        break
                
                # 4. Identifica coluna de ordem/item
                col_item = None
                for col in ['ITEMID', 'NRITEM', 'ORDEM', 'SEQUENCIA']:
                    if col in colunas_fc05100:
                        col_item = col
                        break
                
                print(f"  [KIT FC05100] Mapeamento: componente={col_componente}, formula={col_formula}, item={col_item}")
                
                if not col_componente or not col_formula:
                    print(f"  [KIT FC05100] ERRO: Colunas essenciais não encontradas!")
                    return []
                
                # 5. Monta query dinâmica
                order_clause = f"ORDER BY c.{col_item}" if col_item else ""
                
                query = f"""
                    SELECT 
                        c.{col_componente},
                        {"c." + col_item if col_item else "1"} as ITEMORD,
                        p.NOMRED,
                        p.DESCR,
                        l.NRLOT,
                        l.DTFAB,
                        l.DTVAL
                    FROM FC05100 c
                    LEFT JOIN FC03000 p ON c.{col_componente} = p.CDPRO
                    LEFT JOIN FC03140 l ON c.{col_componente} = l.CDPRO AND l.CDFIL = ?
                    WHERE c.{col_formula} = ?
                    {order_clause}
                """
                print(f"  [KIT FC05100] Query: {query.strip()}")
                cursor.execute(query, (cdfil, cdfrm))
                
                rows = cursor.fetchall()
                print(f"  [KIT FC05100] {len(rows)} componentes encontrados para CDFRM={cdfrm}")
                
                for row in rows:
                    cdsac = row[0]       # Código do componente
                    itemid = row[1]      # Ordem do componente
                    nomred = row[2]      # Nome reduzido (FC03000)
                    descr = row[3]       # Descrição (FC03000)
                    lote = row[4]        # Lote (FC03140 - pode ser NULL)
                    fab = row[5]         # Fabricação (FC03140 - pode ser NULL)
                    val = row[6]         # Validade (FC03140 - pode ser NULL)
                    
                    # Nome do componente: prioriza NOMRED, fallback para DESCR
                    nome_comp = nomred or descr or f"COMP_{cdsac}"
                    nome_comp = nome_comp.strip() if nome_comp else ""
                    
                    # Formata datas
                    lote_str = str(lote).strip() if lote else ""
                    fab_str = fab.strftime('%m/%y') if fab else ""
                    val_str = val.strftime('%m/%y') if val else ""
                    
                    print(f"    [COMP] CDSAC={cdsac}, NOME={nome_comp[:40]}, LT:{lote_str}, F:{fab_str}, V:{val_str}")
                    
                    # Tenta buscar pH na FC06100 se não tiver na FC03140
                    ph = ""
                    try:
                        cursor.execute("""
                            SELECT FIRST 1 PH FROM FC06100
                            WHERE CDPRO = ? AND CDFIL = ?
                        """, (cdsac, cdfil))
                        ph_row = cursor.fetchone()
                        if ph_row and ph_row[0]:
                            ph = str(ph_row[0]).strip()
                    except Exception as e:
                        print(f"      [PH ERRO] {e}")
                    
                    # Remove prefixos do nome (AMP, KIT, etc)
                    nome_limpo = nome_comp.upper().strip()
                    for prefixo in ['AMP ', 'CX ', 'KIT ', 'FRS ']:
                        if nome_limpo.startswith(prefixo):
                            nome_limpo = nome_limpo[len(prefixo):]
                            break
                    
                    componentes.append({
                        "codigo": str(cdsac),
                        "nome": nome_limpo,
                        "ph": ph,
                        "lote": lote_str,
                        "fabricacao": fab_str,
                        "validade": val_str
                    })
                
            except Exception as e:
                print(f"  [KIT FC05100 ERRO] {e}")
            
            return componentes
        
        data = []
        for idx, item in enumerate(itens):
            serier = item[0]  # SERIER - número da barra (0, 1, 2...) direto do banco
            cdpro = item[5]
            cdprin = item[6]  # CDPRIN - código do produto principal (base para mesclas)
            # ITEMID - identificador do item na FC12110 (com fallback seguro)
            item_id = item[7] if len(item) > 7 else None
            nome_produto = item[1] or ""  # DESCR da FC12110
            
            # =====================================================
            # PRIORIDADE: Busca dados na FC99999 usando CDPRIN quando disponível
            # CDPRIN contém o código do produto base (ex: 92779 para TRISH)
            # CDPRO contém o código do produto específico (ex: 92781 para SKINBOOSTER)
            # =====================================================
            print(f"\n{'='*60}")
            print(f"DEBUG FC99999 - Barra {serier} (SERIER)")
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
            # VERIFICAÇÃO DE KIT: PRIORIDADE FC12111 (fonte definitiva)
            # FC12111 contém a "explosão" do kit na requisição.
            # Se existir registro, é DEFINITIVAMENTE um kit.
            # Fallback: FC05000/FC05100 se FC12111 não tiver dados.
            # =====================================================
            e_kit = False
            componentes_kit = []
            
            # ESTRATÉGIA 1: Verifica via FC12111 (fonte definitiva)
            e_kit_fc12111 = verificar_kit_fc12111(cursor, nr_requisicao, serier, filial)
            
            if e_kit_fc12111:
                print(f"  -> IDENTIFICADO COMO KIT via FC12111! NRRQU={nr_requisicao}, SERIER={serier}")
                componentes_kit = buscar_componentes_kit_fc12111(cursor, nr_requisicao, serier, filial)
                e_kit = len(componentes_kit) > 0
                print(f"  -> {len(componentes_kit)} componentes encontrados via FC12111")
            
            # ESTRATÉGIA 2: Fallback para FC05000/FC05100 se FC12111 não retornou componentes
            if not e_kit:
                e_kit_legacy, cdfrm_kit = verificar_se_kit(cursor, cdpro)
                if e_kit_legacy:
                    print(f"  -> FALLBACK: Tentando FC05100 com CDFRM={cdfrm_kit}")
                    componentes_kit = buscar_componentes_kit_fc05100(cursor, cdfrm_kit, filial)
                    e_kit = len(componentes_kit) > 0
                    print(f"  -> {len(componentes_kit)} componentes encontrados via FC05100")

            # =====================================================
            # LÓGICA: PRODUTO ÚNICO vs MESCLA vs KIT
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
                # Fallback: busca matérias-primas (R) do mesmo ITEMID (se disponível)
                # NOTA: item_id foi definido na linha 1453 deste mesmo loop
                materias_primas = []
                if item_id is not None:
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
            
            # Determina tipoItem: KIT > MESCLA > PRODUTO ÚNICO
            if e_kit and len(componentes_kit) > 0:
                tipo_item = "KIT"
            elif e_mescla:
                tipo_item = "MESCLA"
            else:
                tipo_item = "PRODUTO ÚNICO"
            
            rotulo = {
                **dados_base,
                "nrItem": str(serier),  # Usa SERIER do banco - número exato da barra no FórmulaCerta
                "formula": nome_formula,  # Nome simplificado para mesclas
                "volume": str(item[2]) if item[2] else dados_base["volume"],
                "unidadeVolume": item[3] or dados_base["unidadeVolume"],
                "lote": (item[4] or "").strip(),
                "quantidade": str(int(item[2])) if item[2] else "",
                "composicao": composicao,
                "aplicacao": aplicacao,
                "descricaoProduto": descricao_produto,
                "observacoes": composicao,
                "tipoItem": tipo_item,
            }
            
            # Se é KIT, adiciona componentes ao rótulo
            if tipo_item == "KIT":
                rotulo["componentes"] = componentes_kit
                print(f"  -> Rótulo KIT com {len(componentes_kit)} componentes")
            
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


if __name__ == '__main__':
    print("=" * 50)
    print("Servidor iniciando na porta 5000...")
    print(f"Impressão disponível: {PRINTING_AVAILABLE}")
    print("Teste: http://localhost:5000/api/health")
    print("=" * 50)
    app.run(host='0.0.0.0', port=5000, debug=True, threaded=True)
