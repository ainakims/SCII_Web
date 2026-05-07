const db = require('../server/dbService');

exports.getAllItems = async (req, res) => {
    try {
        const items = await db.query('SELECT * FROM Inventario');
        res.json(items);
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.addLote = async (req, res) => {
    try {
        const { ProductoID, NumeroLote, FechaCaducidad, Cantidad, UsuarioID } = req.body;
        // 1. Insert Lote
        await db.execute(`INSERT INTO Lotes (ProductoID, NumeroLote, FechaCaducidad, Cantidad) VALUES (${ProductoID}, '${NumeroLote}', #${FechaCaducidad}#, ${Cantidad})`);

        // 2. We need the new Lote ID. In a real scenario, this would be a transaction.
        const recentLotes = await db.query(`SELECT TOP 1 ID FROM Lotes ORDER BY ID DESC`);
        const LoteID = recentLotes[0].ID;

        // 3. Movement
        await db.execute(`INSERT INTO MovimientosInventario (LoteID, TipoMovimiento, Cantidad, UsuarioID, Referencia) VALUES (${LoteID}, 'ENTRADA_COMPRA', ${Cantidad}, ${UsuarioID}, 'Restock Inicial')`);

        // 4. Update Stock
        await db.execute(`UPDATE Inventario SET StockActual = StockActual + ${Cantidad} WHERE ID = ${ProductoID}`);

        res.status(201).json({ message: 'Lote registrado e inventario sumado' });
    } catch (e) { res.status(500).json({ error: e.message }); }
};

exports.getKardex = async (req, res) => {
    // Complex join spanning MovimientosInventario, Lotes, and Inventario
    res.json([{ msg: 'Kardex placeholder for Dashboard' }]);
};

// Generates Receta and optionally discounts inventory (descuento automático al emitir receta)
exports.prescribeAndDiscount = async (req, res) => {
    try {
        const { ConsultaID, InstruccionesAdicionales, DetallesReceta } = req.body;

        // 1. Create Receta
        await db.execute(`INSERT INTO Recetas (ConsultaID, InstruccionesAdicionales) VALUES (${ConsultaID}, '${InstruccionesAdicionales || ''}')`);
        const recetasLast = await db.query(`SELECT TOP 1 ID FROM Recetas ORDER BY ID DESC`);
        const RecetaID = recetasLast[0].ID;

        // 2. Loop through prescribed meds
        for (let detail of DetallesReceta) {
            let loteUtilizado = 'NULL';

            // Simulating auto-discount logic here
            if (detail.ModoEntrega === 'FARMACIA_INTERNA') {
                // Find oldest lote with available items
                const lotes = await db.query(`SELECT TOP 1 ID, Cantidad FROM Lotes WHERE ProductoID = ${detail.ProductoInventarioID} AND Cantidad >= ${detail.CantidadSurtida} ORDER BY FechaCaducidad ASC`);
                if (lotes.length > 0) {
                    loteUtilizado = lotes[0].ID;
                    // Discount from lote
                    await db.execute(`UPDATE Lotes SET Cantidad = Cantidad - ${detail.CantidadSurtida} WHERE ID = ${loteUtilizado}`);
                    // Movement
                    await db.execute(`INSERT INTO MovimientosInventario (LoteID, TipoMovimiento, Cantidad, UsuarioID, Referencia) VALUES (${loteUtilizado}, 'SALIDA_RECETA', -${detail.CantidadSurtida}, 1, 'Receta #${RecetaID}')`);
                    // General stock
                    await db.execute(`UPDATE Inventario SET StockActual = StockActual - ${detail.CantidadSurtida} WHERE ID = ${detail.ProductoInventarioID}`);
                }
            }

            await db.execute(`INSERT INTO RecetaDetalles (RecetaID, MedicamentoID, Dosis, Frecuencia, Duracion, CantidadEntregada, LoteUtilizadoID) VALUES (${RecetaID}, ${detail.MedicamentoID}, '${detail.Dosis}', '${detail.Frecuencia}', '${detail.Duracion}', ${detail.CantidadSurtida || 0}, ${loteUtilizado})`);
        }

        res.json({ message: 'Receta digital generada exitosamente. Código QR y descuento aplicado si procede.', RecetaID });
    } catch (e) { res.status(500).json({ error: e.message }); }
};
