export const structure = {
    tables: {
        students: {
            tableColumns: ['numero_libreta', 'dni', 'first_name', 'last_name', 'email', 'enrollment_date', 'status'],
            columnsToDisplay: {
                numero_libreta: { type: 'string', label: "Número de Libreta / Student ID:", required: true },
                dni: { type: 'number', label: "DNI:", required: true },
                first_name: { type: 'string', label: "Nombre / Name:", required: true },
                last_name: { type: 'string', label: "Apellido / Last name:", required: true },
                email: { type: 'string', label: "Email:" },
                enrollment_date: { type: 'date', label: "Fecha de inscripción / Enrollment Date:" },
                status: { type: 'status', label: "Estado / Status:" },
            },
            pk: 'numero_libreta',
            uiName: 'Student'
        },
        subjects: {
            tableColumns: ['cod_mat', 'name', 'description', 'credits', 'department'],
            columnsToDisplay: {
                cod_mat: { type: 'string', label: "Código de Materia / Subject Code:", required: true },
                name: { type: 'string', label: "Nombre de Materia / Subject Name:", required: true },
                description: { type: 'string', label: "Descripción de Materia / Subject Description:" },
                credits: { type: 'number', label: "Créditos / Credits:" },
                department: { type: 'string', label: "Departamento / Department:" },
            },
            pk: 'cod_mat',
            uiName: 'Subject'
        },
        enrollments: {
            pk: 'numero_libreta cod_mat',
            uiName: 'Enrollment',
            tableColumns: ['numero_libreta', 'cod_mat', 'enrollment_date', 'grade', 'status'],
            columnsToDisplay: {
                numero_libreta: { type: 'string', label: "Número de Libreta / Student ID:", required: true },
                student_name: { type: 'string', label: "Nombre de Estudiante / Student Name:", required: true },
                subject_name: { type: 'string', label: "Nombre de Materia / Subject Name:", required: true },
                cod_mat: { type: 'string', label: "Código de Materia / Subject Code:", required: true },
                enrollment_date: { type: 'date', label: "Fecha de Inscripción / Enrollment Date:", required: true },
                grade: { type: 'number', label: "Nota / Grade:" },
                status: { type: 'status', label: "Estado / Status:" }
            },
            foreignKeys: ["subjects", "students"],
        }
    }
};
