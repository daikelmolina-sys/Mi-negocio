import cron from 'node-cron';
import axios from 'axios';
import pool from './db.js';

// Tarea programada para ejecutarse de lunes a viernes a las 8:00 AM y 2:00 PM (horario típico BCV)
export const initBCVCron = () => {
    cron.schedule('0 8,14 * * 1-5', async () => {
        console.log('⏳ Ejecutando actualización automática de la tasa BCV...');
        try {
            // Usando API gratuita DolarApi VE que provee la tasa oficial del BCV actualizada
            const response = await axios.get('https://ve.dolarapi.com/v1/dolares/oficial');
            
            if (response.data && response.data.promedio) {
                const newRate = parseFloat(response.data.promedio);
                
                const client = await pool.connect();
                try {
                    await client.query(
                        'UPDATE settings SET exchange_rate = $1, updated_at = CURRENT_TIMESTAMP',
                        [newRate]
                    );
                    console.log(`✅ Tasa BCV actualizada exitosamente a: Bs. ${newRate}`);
                } finally {
                    client.release();
                }
            }
        } catch (error) {
            console.error('❌ Error actualizando la tasa BCV automáticamente:', error.message);
        }
    }, {
        scheduled: true,
        timezone: "America/Caracas"
    });
};
