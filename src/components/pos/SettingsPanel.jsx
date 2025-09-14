
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Settings, Save, Upload, Download, Type, Palette, Image as ImageIcon, AlertTriangle, Sun, Moon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { usePOS } from '@/contexts/POSContext';
import { toast } from '@/components/ui/use-toast';
import { useTheme } from '@/contexts/ThemeContext';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

export default function SettingsPanel() {
  const { state, dispatch } = usePOS();
  const [settings, setSettings] = useState(state.settings);
  const { theme, setTheme } = useTheme();

  const handleSave = () => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
    toast({ title: "Configuración guardada", description: "La configuración ha sido actualizada." });
  };

  const handleSettingsChange = (key, value) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const handleDocumentSettingsChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      document: {
        ...prev.document,
        [key]: value
      }
    }));
  };
  
  const handleWatermarkChange = (key, value) => {
    setSettings(prev => ({
      ...prev,
      document: {
        ...prev.document,
        watermark: {
          ...prev.document.watermark,
          [key]: value
        }
      }
    }));
  };

  const exportData = () => {
    try {
      const dataToExport = { ...state, cart: undefined };
      const dataStr = JSON.stringify(dataToExport, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `ferrePOS_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      toast({ title: "Datos exportados", description: "Copia de seguridad completa creada." });
    } catch (error) {
      toast({ title: "Error al exportar", description: "No se pudo generar la copia de seguridad.", variant: "destructive" });
    }
  };

  const importData = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target.result);
          dispatch({ type: 'LOAD_DATA', payload: importedData });
          setSettings(importedData.settings || state.settings);
          toast({ title: "Datos importados", description: "Copia de seguridad restaurada correctamente." });
        } catch (error) {
          toast({ title: "Error de importación", description: "El archivo de copia de seguridad es inválido.", variant: "destructive" });
        }
      };
      reader.readAsText(file);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Configuración</h1>
        <div className="flex items-center gap-2">
          <Sun className="h-5 w-5" />
          <Switch checked={theme === 'dark'} onCheckedChange={(checked) => setTheme(checked ? 'dark' : 'light')} />
          <Moon className="h-5 w-5" />
        </div>
      </div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="card-glass p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Datos de la Empresa</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div><Label htmlFor="companyName">Nombre</Label><Input id="companyName" value={settings.companyName} onChange={(e) => handleSettingsChange('companyName', e.target.value)} /></div>
          <div><Label htmlFor="companyAddress">Dirección</Label><Input id="companyAddress" value={settings.companyAddress} onChange={(e) => handleSettingsChange('companyAddress', e.target.value)} /></div>
          <div><Label htmlFor="companyPhone">Teléfono</Label><Input id="companyPhone" value={settings.companyPhone} onChange={(e) => handleSettingsChange('companyPhone', e.target.value)} /></div>
          <div><Label htmlFor="taxRate">Tasa de IVA (%)</Label><Input id="taxRate" type="number" step="0.01" min="0" value={settings.taxRate * 100} onChange={(e) => handleSettingsChange('taxRate', parseFloat(e.target.value) / 100 || 0)} /></div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="card-glass p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Personalización de Documentos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <div className="space-y-2"><Label>Fuente</Label><Select value={settings.document.fontFamily} onValueChange={(v) => handleDocumentSettingsChange('fontFamily', v)}><SelectTrigger><SelectValue /></SelectTrigger><SelectContent><SelectItem value="Inter">Inter</SelectItem><SelectItem value="Roboto">Roboto</SelectItem><SelectItem value="Times New Roman">Times New Roman</SelectItem><SelectItem value="Courier New">Courier New</SelectItem></SelectContent></Select></div>
          <div className="space-y-2"><Label>Tamaño (pt)</Label><Input type="number" value={settings.document.fontSize} onChange={(e) => handleDocumentSettingsChange('fontSize', parseInt(e.target.value, 10) || 12)} /></div>
          <div className="space-y-2"><Label>Color</Label><div className="flex items-center gap-2"><Input type="color" value={settings.document.fontColor} onChange={(e) => handleDocumentSettingsChange('fontColor', e.target.value)} className="p-1 h-10 w-14" /><span style={{ color: settings.document.fontColor, fontFamily: settings.document.fontFamily, fontSize: `${settings.document.fontSize}px`}}>Texto</span></div></div>
          <div className="space-y-2 col-span-full"><Label>Logo URL</Label><Input placeholder="https://..." value={settings.document.logoUrl} onChange={(e) => handleDocumentSettingsChange('logoUrl', e.target.value)} /></div>
          <div className="space-y-2"><Label>Pie de página legal</Label><Input value={settings.document.legalFooter} onChange={(e) => handleDocumentSettingsChange('legalFooter', e.target.value)} /></div>
          <div className="space-y-2 flex items-center gap-2 pt-6"><Switch id="showQr" checked={settings.document.showQr} onCheckedChange={(c) => handleDocumentSettingsChange('showQr', c)} /><Label htmlFor="showQr">Mostrar QR</Label></div>
        </div>
        <h3 className="text-lg font-semibold mt-6 mb-4">Marca de Agua (Remitos)</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="space-y-2"><Label>Texto</Label><Input placeholder="Ej: 'NO VÁLIDO'" value={settings.document.watermark.text} onChange={(e) => handleWatermarkChange('text', e.target.value)} /></div>
            <div className="space-y-2"><Label>Opacidad ({settings.document.watermark.opacity})</Label><Slider value={[settings.document.watermark.opacity]} onValueChange={([v]) => handleWatermarkChange('opacity', v)} max={1} step={0.1} /></div>
            <div className="space-y-2"><Label>Rotación ({settings.document.watermark.rotation}°)</Label><Slider value={[settings.document.watermark.rotation]} onValueChange={([v]) => handleWatermarkChange('rotation', v)} max={360} step={1} /></div>
        </div>
      </motion.div>
      
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="card-glass p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Parámetros</h2>
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div><Label htmlFor="restockThreshold" className="flex items-center"><AlertTriangle className="mr-2 h-4 w-4"/>Umbral de Recompra (días)</Label><Input id="restockThreshold" type="number" min="1" value={settings.restockThreshold} onChange={(e) => handleSettingsChange('restockThreshold', parseInt(e.target.value) || 30)} /></div>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="card-glass p-6 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Gestión de Datos</h2>
        <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
          <Button onClick={exportData} variant="outline" className="flex-1"><Download className="h-4 w-4 mr-2" />Exportar Backup</Button>
          <Button asChild variant="outline" className="flex-1"><label className="cursor-pointer flex items-center justify-center"><Upload className="h-4 w-4 mr-2" />Importar Backup<input type="file" accept=".json" className="hidden" onChange={importData} /></label></Button>
        </div>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex justify-end mt-6">
        <Button size="lg" onClick={handleSave}><Save className="h-4 w-4 mr-2" />Guardar Configuración</Button>
      </motion.div>
    </div>
  );
}
