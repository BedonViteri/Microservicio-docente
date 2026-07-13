import psycopg2

def main():
    print("====== INICIANDO SEED MANUAL DE SGA DOCENTE ======")
    
    conn = psycopg2.connect(dbname="sga", user="postgres", password="postgres", host="localhost", port="5433")
    conn.autocommit = True
    cursor = conn.cursor()

    try:
        # 1. Encontrar IDs dinámicos
        cursor.execute("SELECT id_usuario FROM sga_principal.usuarios WHERE username = 'keyla123@correo.local'")
        usr = cursor.fetchone()
        if not usr:
            print("Usuario keyla123@correo.local no encontrado.")
            return
        id_docente = usr[0]
        
        # Buscar Asignación (Matemáticas, Sexto Grado, Paralelo A)
        cursor.execute("""
            SELECT a.id_asignacion, a.id_grado, a.id_ano_lectivo
            FROM sga_principal.asignaciones a
            JOIN sga_principal.asignaturas asg ON a.id_asignatura = asg.id_asignatura
            JOIN sga_principal.grados g ON a.id_grado = g.id_grado
            WHERE a.id_docente = %s AND asg.nombre = 'Matemáticas' AND g.nombre = 'Sexto Grado' AND a.activo = true
            LIMIT 1
        """, (id_docente,))
        asig = cursor.fetchone()
        if not asig:
            print("No se encontró la asignación de Matemáticas para Sexto Grado.")
            return
            
        id_asignacion = asig[0]
        id_grado = asig[1]
        id_ano_lectivo = asig[2]
        
        # Obtener matrículas (Juan Pérez y María López)
        cursor.execute("""
            SELECT m.id_matricula, e.nombres
            FROM sga_principal.matriculas m
            JOIN sga_principal.estudiantes e ON m.id_estudiante = e.id_estudiante
            WHERE m.id_grado = %s AND m.estado = 'ACTIVA'
        """, (id_grado,))
        estudiantes = cursor.fetchall()
        
        # 2. Periodo (Primer trimestre)
        cursor.execute("SELECT id_periodo FROM sga_docente.periodos_evaluacion WHERE id_ano_lectivo = %s AND tipo = 'PRIMER_TRIMESTRE'", (id_ano_lectivo,))
        per_res = cursor.fetchone()
        if not per_res:
            cursor.execute("""
                INSERT INTO sga_docente.periodos_evaluacion 
                (id_ano_lectivo, tipo, nombre, fecha_inicio, fecha_fin, activo)
                VALUES (%s, 'PRIMER_TRIMESTRE', 'Primer Trimestre 2026-2027', '2026-05-01', '2026-08-31', true)
                RETURNING id_periodo
            """, (id_ano_lectivo,))
            id_periodo = cursor.fetchone()[0]
        else:
            id_periodo = per_res[0]
            
        print(f"IDs -> Docente: {id_docente}, Asignación: {id_asignacion}, Periodo: {id_periodo}")
        
        # 3. Actividades
        print("Insertando actividades...")
        cursor.execute("SELECT id_actividad FROM sga_docente.actividades WHERE id_asignacion = %s AND nombre = 'Tarea de Álgebra'", (id_asignacion,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO sga_docente.actividades 
                (id_asignacion, id_periodo, tipo, nombre, descripcion, fecha_entrega, ponderacion, nota_maxima, es_sumativa, fecha_creacion)
                VALUES (%s, %s, 'TAREA', 'Tarea de Álgebra', 'Resolución de ecuaciones lineales', '2026-07-20', 10.00, 10.00, false, NOW())
            """, (id_asignacion, id_periodo))

        cursor.execute("SELECT id_actividad FROM sga_docente.actividades WHERE id_asignacion = %s AND nombre = 'Examen Parcial de Matemáticas'", (id_asignacion,))
        if not cursor.fetchone():
            cursor.execute("""
                INSERT INTO sga_docente.actividades 
                (id_asignacion, id_periodo, tipo, nombre, descripcion, fecha_entrega, ponderacion, nota_maxima, es_sumativa, fecha_creacion)
                VALUES (%s, %s, 'EXAMEN_TRIMESTRAL', 'Examen Parcial de Matemáticas', 'Evaluación del primer bloque', '2026-08-15', 30.00, 10.00, true, NOW())
            """, (id_asignacion, id_periodo))
            
        # 4. Asistencias
        print("Insertando asistencias y calculando resumen...")
        fecha_asistencia = '2026-07-13'
        for id_mat, nombres in estudiantes:
            estado = 'PRESENTE' if 'Juan' in nombres else 'AUSENTE'
            
            cursor.execute("SELECT id_asistencia FROM sga_docente.asistencias WHERE id_matricula = %s AND id_asignacion = %s AND fecha = %s", (id_mat, id_asignacion, fecha_asistencia))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO sga_docente.asistencias
                    (id_matricula, id_asignacion, id_periodo, fecha, estado, justificacion, registrado_por, fecha_registro, fecha_actualizacion)
                    VALUES (%s, %s, %s, %s, %s, '', %s, NOW(), NOW())
                """, (id_mat, id_asignacion, id_periodo, fecha_asistencia, estado, id_docente))
                
            # Calcular resumen de la matrícula (lógica del servicio)
            cursor.execute("SELECT count(*) FROM sga_docente.asistencias WHERE id_matricula = %s AND id_asignacion = %s AND estado = 'PRESENTE'", (id_mat, id_asignacion))
            tot_presentes = cursor.fetchone()[0]
            
            cursor.execute("SELECT count(*) FROM sga_docente.asistencias WHERE id_matricula = %s AND id_asignacion = %s AND estado = 'AUSENTE'", (id_mat, id_asignacion))
            tot_ausentes = cursor.fetchone()[0]
            
            cursor.execute("SELECT count(*) FROM sga_docente.asistencias WHERE id_matricula = %s AND id_asignacion = %s AND estado = 'JUSTIFICADO'", (id_mat, id_asignacion))
            tot_justif = cursor.fetchone()[0]
            
            cursor.execute("SELECT count(*) FROM sga_docente.asistencias WHERE id_matricula = %s AND id_asignacion = %s AND estado = 'ATRASO'", (id_mat, id_asignacion))
            tot_atrasos = cursor.fetchone()[0]
            
            cursor.execute("SELECT id_resumen FROM sga_docente.resumen_asistencia WHERE id_matricula = %s AND id_asignacion = %s AND id_periodo = %s", (id_mat, id_asignacion, id_periodo))
            if not cursor.fetchone():
                cursor.execute("""
                    INSERT INTO sga_docente.resumen_asistencia
                    (id_matricula, id_asignacion, id_periodo, total_presentes, total_ausentes, total_justificados, total_atrasos, calculado_en)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, NOW())
                """, (id_mat, id_asignacion, id_periodo, tot_presentes, tot_ausentes, tot_justif, tot_atrasos))
            else:
                cursor.execute("""
                    UPDATE sga_docente.resumen_asistencia
                    SET total_presentes = %s, total_ausentes = %s, total_justificados = %s, total_atrasos = %s, calculado_en = NOW()
                    WHERE id_matricula = %s AND id_asignacion = %s AND id_periodo = %s
                """, (tot_presentes, tot_ausentes, tot_justif, tot_atrasos, id_mat, id_asignacion, id_periodo))

        print("====== SEED MANUAL SGA DOCENTE COMPLETADO ======")

    except Exception as e:
        print(f"Error durante el seed: {e}")
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main()
