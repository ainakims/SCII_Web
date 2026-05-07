const db = require('../server/dbService');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// A fallback secret if not in .env for development
const JWT_SECRET = process.env.JWT_SECRET || 'scii_ai_secret_super_key_2026';

exports.login = async (req, res) => {
    try {
        const { Correo, Contrasena } = req.body;

        if (!Correo || !Contrasena) {
            return res.status(400).json({ message: 'El correo y la contraseña son requeridos.' });
        }

        // 1. Check if user exists in Usuarios
        const users = await db.query(`SELECT * FROM Usuarios WHERE Username = '${Correo}'`);
        if (users.length === 0) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        const user = users[0];

        // 2. Check if active
        // MS Access True is usually -1. If it's a bit, we check if it evaluates to false or 0.
        if (user.IsActive === 0 || user.IsActive === false) {
            return res.status(401).json({ message: 'La cuenta se encuentra deshabilitada.' });
        }

        // 3. Verify Password
        const match = await bcrypt.compare(Contrasena, user.PasswordHash);
        if (!match) {
            return res.status(401).json({ message: 'Credenciales inválidas.' });
        }

        // 4. If it's a Medico (Role = 1 based on our previous adjustment, or just check Medicos table)
        let medicoData = null;

        const medicos = await db.query(`SELECT ID, Nombre, ApellidoPaterno, ApellidoMaterno, Especialidad, FotoUrl FROM Medicos WHERE UsuarioID = ${user.ID}`);
        if (medicos.length > 0) {
            medicoData = medicos[0];
        } else {
            // Optional: Handle Admins who are not Medicos
            return res.status(403).json({ message: 'El usuario no tiene un perfil médico asociado.' });
        }

        // 5. Generate JWT Token
        const payload = {
            UsuarioID: user.ID,
            RoleID: user.RoleID,
            Correo: user.Email,
            MedicoID: medicoData.ID,
            NombreCompleto: `Dr. ${medicoData.Nombre} ${medicoData.ApellidoPaterno}`,
            Especialidad: medicoData.Especialidad,
            FotoUrl: medicoData.FotoUrl
        };

        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' });

        // 6. Return response
        res.status(200).json({
            message: 'Autenticación exitosa',
            token,
            user: payload
        });

    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: 'Error interno del servidor during login.' });
    }
};
