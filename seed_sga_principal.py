import psycopg2
import bcrypt
from datetime import date, datetime

def main():
    print("====== INICIANDO SEED MANUAL DE SGA PRINCIPAL ======")
    
    # Password hash
    password = b"Keyla123@"
    hashed = bcrypt.hashpw(password, bcrypt.gensalt(rounds=10)).decode('utf-8')
    # Spring security expects bcrypt hashes starting with $2a$, python bcrypt generates $2b$
    # Both are compatible, but Spring handles $2a$ automatically
    hashed = hashed.replace('$2b$', '$2a$')
    
    # DB connection
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
        # 1. Rol
        cursor.execute("SELECT id_rol FROM sga_principal.roles WHERE nombre = 'ROLE_DOCENTE'")
        rol_res = cursor.fetchone()
        if not rol_res:
            cursor.execute("INSERT INTO sga_principal.roles (nombre, descripcion, activo) VALUES ('ROLE_DOCENTE', 'Docente del sistema', true) RETURNING id_rol")
            id_rol = cursor.fetchone()[0]
        else:
            id_rol = rol_res[0]

        # 2. Usuario
        username = "keyla123@correo.local"
        cursor.execute("SELECT id_usuario FROM sga_principal.usuarios WHERE username = %s", (username,))
        usr_res = cursor.fetchone()
        if not usr_res:
            cursor.execute("""
                INSERT INTO sga_principal.usuarios 
                (username, correo, password_hash, estado, primer_ingreso, intentos_fallidos, fecha_creacion, fecha_actualizacion) 
                VALUES (%s, %s, %s, true, false, 0, NOW(), NOW()) RETURNING id_usuario
            """, (username, username, hashed))
            id_usuario = cursor.fetchone()[0]
            
            cursor.execute("INSERT INTO sga_principal.usuario_roles (id_usuario, id_rol) VALUES (%s, %s)", (id_usuario, id_rol))
        else:
            id_usuario = usr_res[0]

        # 3. Persona
        cursor.execute("SELECT id_persona FROM sga_principal.personas WHERE id_usuario = %s", (id_usuario,))
        per_res = cursor.fetchone()
        if not per_res:
            cursor.execute("""
                INSERT INTO sga_principal.personas 
                (id_usuario, cedula, nombres, apellidos) 
                VALUES (%s, '0000000001', 'Keyla', 'Docente') RETURNING id_persona
            """, (id_usuario,))
            id_persona = cursor.fetchone()[0]
        else:
            id_persona = per_res[0]

        # 4. Año Lectivo
        cursor.execute("SELECT id_ano_lectivo FROM sga_principal.anos_lectivos WHERE nombre = '2026 - 2027'")
        ano_res = cursor.fetchone()
        if not ano_res:
            cursor.execute("""
                INSERT INTO sga_principal.anos_lectivos 
                (nombre, fecha_inicio, fecha_fin, es_actual) 
                VALUES ('2026 - 2027', '2026-04-01', '2027-02-28', true) RETURNING id_ano_lectivo
            """)
            id_ano_lectivo = cursor.fetchone()[0]
        else:
            id_ano_lectivo = ano_res[0]

        # 4.5. Nivel Educativo
        cursor.execute("SELECT id_nivel FROM sga_principal.niveles_educativos WHERE nombre = 'Educación General Básica Superior'")
        niv_res = cursor.fetchone()
        if not niv_res:
            cursor.execute("INSERT INTO sga_principal.niveles_educativos (nombre, tipo_escala, grado_inicio, grado_fin) VALUES ('Educación General Básica Superior', 'CUANTITATIVA', 8, 10) RETURNING id_nivel")
            id_nivel = cursor.fetchone()[0]
        else:
            id_nivel = niv_res[0]

        # 5. Grado
        cursor.execute("SELECT id_grado FROM sga_principal.grados WHERE nombre = 'Octavo de prueba'")
        gra_res = cursor.fetchone()
        if not gra_res:
            cursor.execute("INSERT INTO sga_principal.grados (nombre, orden, capacidad_max, activo, id_nivel) VALUES ('Octavo de prueba', 8, 35, true, %s) RETURNING id_grado", (id_nivel,))
            id_grado = cursor.fetchone()[0]
        else:
            id_grado = gra_res[0]

        # 6. Asignatura
        cursor.execute("SELECT id_asignatura FROM sga_principal.asignaturas WHERE nombre = 'Matemática de prueba'")
        asig_res = cursor.fetchone()
        if not asig_res:
            cursor.execute("INSERT INTO sga_principal.asignaturas (nombre, codigo, activa) VALUES ('Matemática de prueba', 'MAT01', true) RETURNING id_asignatura")
            id_asignatura = cursor.fetchone()[0]
        else:
            id_asignatura = asig_res[0]

        # 6.5. Paralelo
        cursor.execute("SELECT id_paralelo FROM sga_principal.paralelos WHERE letra = 'A' AND id_grado = %s", (id_grado,))
        par_res = cursor.fetchone()
        if not par_res:
            cursor.execute("INSERT INTO sga_principal.paralelos (letra, id_grado, activo) VALUES ('A', %s, true) RETURNING id_paralelo", (id_grado,))
            id_paralelo = cursor.fetchone()[0]
        else:
            id_paralelo = par_res[0]

        # 7. Asignación
        cursor.execute("""
            SELECT id_asignacion FROM sga_principal.asignaciones 
            WHERE id_docente = %s AND id_ano_lectivo = %s AND id_grado = %s AND id_asignatura = %s AND id_paralelo = %s
        """, (id_usuario, id_ano_lectivo, id_grado, id_asignatura, id_paralelo))
        asgn_res = cursor.fetchone()
        if not asgn_res:
            cursor.execute("""
                INSERT INTO sga_principal.asignaciones 
                (id_docente, id_ano_lectivo, id_grado, id_asignatura, id_paralelo, activo) 
                VALUES (%s, %s, %s, %s, %s, true) RETURNING id_asignacion
            """, (id_usuario, id_ano_lectivo, id_grado, id_asignatura, id_paralelo))
            id_asignacion = cursor.fetchone()[0]
        else:
            id_asignacion = asgn_res[0]

        # 8. Estudiantes
        id_estudiantes = []
        for i, (cedula, ap) in enumerate([('0000000002', 'Uno'), ('0000000003', 'Dos')]):
            cursor.execute("SELECT id_estudiante FROM sga_principal.estudiantes WHERE cedula = %s", (cedula,))
            est_res = cursor.fetchone()
            if not est_res:
                cursor.execute("""
                    INSERT INTO sga_principal.estudiantes 
                    (cedula, nombres, apellidos, codigo_estudiante) 
                    VALUES (%s, 'Estudiante Prueba', %s, %s) RETURNING id_estudiante
                """, (cedula, ap, f"COD{i}"))
                id_est = cursor.fetchone()[0]
            else:
                id_est = est_res[0]
            id_estudiantes.append(id_est)

        # 9. Matrículas
        id_matriculas = []
        for id_est in id_estudiantes:
            cursor.execute("""
                SELECT id_matricula FROM sga_principal.matriculas 
                WHERE id_estudiante = %s AND id_ano_lectivo = %s AND id_grado = %s AND id_paralelo = %s
            """, (id_est, id_ano_lectivo, id_grado, id_paralelo))
            mat_res = cursor.fetchone()
            if not mat_res:
                cursor.execute("""
                    INSERT INTO sga_principal.matriculas 
                    (id_estudiante, id_ano_lectivo, id_grado, id_paralelo, estado, fecha_registro) 
                    VALUES (%s, %s, %s, %s, 'ACTIVA', NOW()) RETURNING id_matricula
                """, (id_est, id_ano_lectivo, id_grado, id_paralelo))
                id_mat = cursor.fetchone()[0]
            else:
                id_mat = mat_res[0]
            id_matriculas.append(id_mat)

        print("====== DATOS CREADOS CORRECTAMENTE ======")
        print(f"ID Asignacion: {id_asignacion}")
        print(f"ID Matriculas: {id_matriculas}")
        
    except Exception as e:
        print("ERROR:", e)
    finally:
        cursor.close()
        conn.close()

if __name__ == '__main__':
    main()
