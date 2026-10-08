import pool from '../utils/db.js';
import bcrypt from 'bcryptjs';

export const getUsers = async (req, res) => {
    try {
        const result = await pool.query('SELECT id, username, role, created_at FROM users ORDER BY id ASC');
        res.json(result.rows);
    } catch (error) {
        res.status(500).json({ error: 'Error obteniendo usuarios' });
    }
};

export const createUser = async (req, res) => {
    try {
        const { username, password, role } = req.body;
        if (!username || !password) return res.status(400).json({ error: 'Usuario y contraseña son requeridos' });

        const hashedPassword = await bcrypt.hash(password, 10);
        const result = await pool.query(
            'INSERT INTO users (username, password, role) VALUES ($1, $2, $3) RETURNING id, username, role',
            [username, hashedPassword, role || 'CASHIER']
        );
        res.status(201).json(result.rows[0]);
    } catch (error) {
        if (error.code === '23505') {
            return res.status(400).json({ error: 'El nombre de usuario ya existe' });
        }
        res.status(500).json({ error: 'Error creando usuario' });
    }
};

export const deleteUser = async (req, res) => {
    try {
        const { id } = req.params;
        if (id == 1 || id == req.user.id) {
            return res.status(400).json({ error: 'No puedes eliminar este usuario' });
        }
        await pool.query('DELETE FROM users WHERE id = $1', [id]);
        res.json({ message: 'Usuario eliminado' });
    } catch (error) {
        res.status(500).json({ error: 'Error eliminando usuario' });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { id } = req.params;
        const { username, password, role } = req.body;
        
        if (id == 1 && req.user.id != 1) {
             return res.status(403).json({ error: 'No puedes editar al administrador maestro' });
        }

        if (password) {
            const hashedPassword = await bcrypt.hash(password, 10);
            await pool.query(
                'UPDATE users SET username = $1, password = $2, role = $3 WHERE id = $4',
                [username, hashedPassword, role, id]
            );
        } else {
            await pool.query(
                'UPDATE users SET username = $1, role = $2 WHERE id = $3',
                [username, role, id]
            );
        }
        res.json({ message: 'Usuario actualizado' });
    } catch (error) {
        res.status(500).json({ error: 'Error actualizando usuario' });
    }
};
