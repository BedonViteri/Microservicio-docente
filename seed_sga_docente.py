import psycopg2

def main():
    print("====== INICIANDO SEED MANUAL DE SGA DOCENTE ======")
    
    conn = psycopg2.connect(
        dbname="sga",
        user="postgres",
        password="postgres",
        host="localhost",
        port="5433"
    )
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        # 1. Encontrar IDs en sga_principal
        print("Obteniendo IDs desde sga_principal...")
        cursor.execute("SELECT id_usuario FROM sga_principal.usuarios WHERE username = 'keyla123@correo.local'")
        usr = cursor.fetchone()
        if not usr:
            print("Usuario keyla123@correo.local no encontrado.")
            return
        id_docente = usr[0]
        
        cursor.execute("SELECT id_asignacion, id_grado FROM sga_principal.asignaciones WHERE id_docente = %s AND activo = true LIMIT 1", (id_docente,))
        asig = cursor.fetchone()
        if not asig:
            print("No se encontro asignacion activa para el docente.")
            return
        
        id_asignacion = asig[0]
        id_grado = asig[1]
        
        cursor.execute("""
            SELECT m.id_matricula 
            FROM sga_principal.matriculas m
            WHERE m.id_grado = %s AND m.estado = 'ACTIVA'
        """, (id_grado,))
        matriculas = [r[0] for r in cursor.fetchall()]
        
        # 2. Encontrar o crear periodo
        cursor.execute("SELECT id_periodo FROM sga_docente.periodos_evaluacion WHERE id_ano_lectivo = 1 LIMIT 1")
        per_res = cursor.fetchone()
        if not per_res:
            cursor.execute("""
                INSERT INTO sga_docente.periodos_evaluacion 
                (id_ano_lectivo, tipo, nombre, fecha_inicio, fecha_fin, activo)
                VALUES (1, 'PRIMER_TRIMESTRE', 'Primer Trimestre 2026-2027', '2026-05-01', '2026-08-31', true)
                RETURNING id_periodo
            """)
            id_periodo = cursor.fetchone()[0]
        else:
            id_periodo = per_res[0]
            
        print(f"IDs encontrados -> Docente: {id_docente}, Asignacion: {id_asignacion}, Periodo: {id_periodo}")
        print(f"Matriculas: {matriculas}")
        
        # 3. Crear Actividades
        print("Insertando actividades...")
        cursor.execute("SELECT id_actividad FROM sga_docente.actividades WHERE id_asignacion = %s AND nombre = 'Tarea de prueba'", (id_asignacion,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO sga_docente.actividades 
                (id_asignacion, id_periodo, tipo, nombre, descripcion, fecha_entrega, ponderacion, nota_maxima, es_sumativa, fecha_creacion)
                VALUES (%s, %s, 'TAREA', 'Tarea de prueba', 'Prueba generada por el seed', '2026-07-20', 10.00, 10.00, false, NOW())
            """, (id_asignacion, id_periodo))

        cursor.execute("SELECT id_actividad FROM sga_docente.actividades WHERE id_asignacion = %s AND nombre = 'Examen Parcial'", (id_asignacion,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO sga_docente.actividades 
                (id_asignacion, id_periodo, tipo, nombre, descripcion, fecha_entrega, ponderacion, nota_maxima, es_sumativa, fecha_creacion)
                VALUES (%s, %s, 'EXAMEN_TRIMESTRAL', 'Examen Parcial', 'Prueba generada por el seed', '2026-08-15', 30.00, 10.00, true, NOW())
            """, (id_asignacion, id_periodo))
            
        # 4. Crear Asistencias
        print("Insertando asistencias...")
        fecha_asistencia = '2026-07-13'
        for i, id_mat in enumerate(matriculas):
            estado = 'PRESENTE' if i == 0 else 'AUSENTE'
            cursor.execute("SELECT id_asistencia FROM sga_docente.asistencias WHERE id_matricula = %s AND id_asignacion = %s AND fecha = %s", (id_mat, id_asignacion, fecha_asistencia))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO sga_docente.asistencias
                    (id_matricula, id_asignacion, id_periodo, fecha, estado, justificacion, registrado_por, fecha_registro, fecha_actualizacion)
                    VALUES (%s, %s, %s, %s, %s, '', %s, NOW(), NOW())
                """, (id_mat, id_asignacion, id_periodo, fecha_asistencia, estado, id_docente))
                
            # Actualizar o crear resumen
            cursor.execute("SELECT id_resumen FROM sga_docente.resumen_asistencia WHERE id_matricula = %s AND id_asignacion = %s", (id_mat, id_asignacion))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO sga_docente.resumen_asistencia
                    (id_matricula, id_asignacion, id_periodo, total_presentes, total_ausentes, total_justificados, total_atrasos, calculado_en)
                    VALUES (%s, %s, %s, %s, %s, 0, 0, NOW())
                """, (id_mat, id_asignacion, id_periodo, 1 if estado == 'PRESENTE' else 0, 1 if estado == 'AUSENTE' else 0))
            else:
                cursor.execute("""
                    UPDATE sga_docente.resumen_asistencia
                    SET total_presentes = 1, total_ausentes = 0, calculado_en = NOW() WHERE id_matricula = %s AND id_asignacion = %s AND %s = 'PRESENTE'
                """, (id_mat, id_asignacion, estado))
                cursor.execute("""
                    UPDATE sga_docente.resumen_asistencia
                    SET total_presentes = 0, total_ausentes = 1, calculado_en = NOW() WHERE id_matricula = %s AND id_asignacion = %s AND %s = 'AUSENTE'
                """, (id_mat, id_asignacion, estado))
                
        print("====== SEED MANUAL SGA DOCENTE COMPLETADO ======")

    except Exception as e:
        print(f"Error durante el seed: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main()
