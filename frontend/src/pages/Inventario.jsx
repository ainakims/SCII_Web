import React, { useState } from 'react';
import { Box, ArrowUpRight, ArrowDownRight, Search, AlertCircle, BarChart3, Pill } from 'lucide-react';
import { motion } from 'framer-motion';

const Inventario = () => {
    const [searchTerm, setSearchTerm] = useState('');

    const inventoryData = [
        { id: 1, name: 'Paracetamol 500mg', type: 'Tabletas', stock: 124, minStock: 50, location: 'Estante A1', provider: 'Farmatec' },
        { id: 2, name: 'Amoxicilina 500mg', type: 'Cápsulas', stock: 12, minStock: 30, location: 'Estante B2', provider: 'Biopharma' },
        { id: 3, name: 'Ibuprofeno 400mg', type: 'Grageas', stock: 85, minStock: 20, location: 'Estante A2', provider: 'Farmatec' },
        { id: 4, name: 'Ketorolaco 10mg', type: 'Tabletas Sublinguales', stock: 5, minStock: 15, location: 'Estante A3', provider: 'MediLife' },
        { id: 5, name: 'Loratadina 10mg', type: 'Tabletas', stock: 210, minStock: 40, location: 'Estante C1', provider: 'SaludGen' },
        { id: 6, name: 'Omeprazol 20mg', type: 'Cápsulas', stock: 54, minStock: 40, location: 'Estante C2', provider: 'GastroMed' },
    ];

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center bg-white p-4 sm:p-6 rounded-xl border border-gray-200 shadow-sm gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-clinical-darkBlue flex items-center">
                        <Box className="h-6 w-6 mr-2 text-clinical-blue" />
                        Gestión de Farmacia e Inventario
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Control de suministros, Kardex y alertas de abastecimiento</p>
                </div>
                <div className="flex space-x-2">
                    <button className="flex items-center text-gray-700 bg-white border border-gray-300 hover:bg-gray-50 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-sm">
                        <ArrowDownRight className="h-4 w-4 mr-2 text-red-500" />
                        Registrar Salida
                    </button>
                    <button className="flex items-center bg-clinical-blue hover:bg-clinical-darkBlue text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors shadow-md shadow-blue-500/30">
                        <ArrowUpRight className="h-4 w-4 mr-2" />
                        Ingreso de Lote
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* KPI Panel */}
                <div className="col-span-1 space-y-6">
                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="bg-gradient-to-br from-red-50 to-orange-50 rounded-xl border border-red-100 p-5 shadow-sm">
                        <div className="flex justify-between items-start">
                            <div>
                                <p className="text-sm font-bold text-red-800">Alertas de Stock</p>
                                <h3 className="text-3xl font-black text-red-600 mt-1">2</h3>
                                <p className="text-xs text-red-700 mt-1 leading-tight">Productos por debajo del nivel de seguridad.</p>
                            </div>
                            <AlertCircle className="h-8 w-8 text-red-400" />
                        </div>

                        <div className="mt-4 space-y-2">
                            <div className="bg-white/60 p-2 rounded text-xs text-red-900 border border-red-200/50 flex justify-between">
                                <span className="font-semibold truncate pr-2">Amoxicilina 500mg</span>
                                <span className="font-bold">12 / 30</span>
                            </div>
                            <div className="bg-white/60 p-2 rounded text-xs text-red-900 border border-red-200/50 flex justify-between">
                                <span className="font-semibold truncate pr-2">Ketorolaco 10mg</span>
                                <span className="font-bold">5 / 15</span>
                            </div>
                        </div>
                        <button className="w-full mt-4 bg-white text-red-600 text-xs font-bold py-2 rounded-lg border border-red-200 hover:bg-red-50 transition-colors">Generar Orden de Compra</button>
                    </motion.div>

                    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 }} className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <p className="text-sm font-bold text-gray-800">Rotación Mensual</p>
                                <h3 className="text-2xl font-black text-clinical-blue mt-1">1,402</h3>
                                <p className="text-xs text-gray-500 mt-1">Unidades dispensadas</p>
                            </div>
                            <BarChart3 className="h-8 w-8 text-gray-300" />
                        </div>
                        <div className="h-24 bg-gray-50 rounded-lg border border-gray-100 flex items-end justify-between px-2 pt-4 pb-2 space-x-1">
                            {/* Mock Chart */}
                            {[40, 60, 45, 80, 50, 95, 70].map((h, i) => (
                                <div key={i} className="w-full bg-blue-200 rounded-t-sm" style={{ height: `${h}%` }}>
                                    <div className="w-full bg-clinical-blue rounded-t-sm" style={{ height: `${h * 0.7}%` }}></div>
                                </div>
                            ))}
                        </div>
                    </motion.div>
                </div>

                {/* Catalog Table */}
                <div className="col-span-1 md:col-span-3 bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[600px]">
                    <div className="p-4 border-b border-gray-200 flex flex-col sm:flex-row justify-between items-center gap-4 bg-gray-50/50">
                        <div className="relative w-full max-w-sm">
                            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
                                <Search className="h-4 w-4 text-gray-400" />
                            </div>
                            <input
                                type="text"
                                className="block w-full h-10 pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-clinical-blue/20 focus:border-clinical-blue transition-all bg-white"
                                placeholder="Buscar medicamento o código..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>

                        <div className="flex space-x-2">
                            <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-700 bg-white focus:outline-none">
                                <option>Todas las categorías</option>
                                <option>Antibióticos</option>
                                <option>Analgésicos</option>
                                <option>Material de Curación</option>
                            </select>
                        </div>
                    </div>

                    <div className="flex-1 overflow-auto">
                        <table className="min-w-full divide-y divide-gray-200 text-sm text-left">
                            <thead className="bg-gray-50 sticky top-0 z-10">
                                <tr>
                                    <th className="px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider">SKU / Producto</th>
                                    <th className="px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider">Categoría</th>
                                    <th className="px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider text-center">Stock Actual</th>
                                    <th className="px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider">Ubicación</th>
                                    <th className="px-6 py-3 font-semibold text-gray-500 uppercase tracking-wider">Proveedor</th>
                                </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-100">
                                {inventoryData.filter(item => item.name.toLowerCase().includes(searchTerm.toLowerCase())).map((item, idx) => {
                                    const isLow = item.stock <= item.minStock;
                                    return (
                                        <motion.tr
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: idx * 0.05 }}
                                            key={item.id}
                                            className="hover:bg-gray-50/80 transition-colors cursor-pointer"
                                        >
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                <div className="flex items-center">
                                                    <div className={`p-2 rounded-lg ${isLow ? 'bg-red-50 text-red-500' : 'bg-blue-50 text-clinical-blue'}`}>
                                                        <Pill className="h-5 w-5" />
                                                    </div>
                                                    <div className="ml-3">
                                                        <div className="text-sm font-bold text-gray-900">{item.name}</div>
                                                        <div className="text-xs text-gray-500 uppercase tracking-widest mt-0.5">MC-{83740 + item.id}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600">{item.type}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-center">
                                                <span className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-sm font-bold w-20 ${isLow ? 'bg-red-100 text-red-800 border border-red-200' : 'bg-gray-100 text-gray-800'}`}>
                                                    {item.stock} <span className="text-xs font-normal opacity-70 ml-1">u</span>
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-600 font-medium">{item.location}</td>
                                            <td className="px-6 py-4 whitespace-nowrap text-gray-500">{item.provider}</td>
                                        </motion.tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Inventario;
