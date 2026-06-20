import { ipcMain } from 'electron';
import { IPC_CHANNELS } from '../../shared/types';
import * as importService from '../services/importService';

export function registerImportHandlers(): void {
  // Import from CSV
  ipcMain.handle(IPC_CHANNELS.IMPORT_CSV, async (_, filePath: string) => {
    try {
      return await importService.importCSV(filePath);
    } catch (error) {
      console.error('Error importing CSV:', error);
      throw error;
    }
  });

  // Import from Excel
  ipcMain.handle(IPC_CHANNELS.IMPORT_EXCEL, async (_, filePath: string) => {
    try {
      return await importService.importExcel(filePath);
    } catch (error) {
      console.error('Error importing Excel:', error);
      throw error;
    }
  });

  // Parse email text
  ipcMain.handle(IPC_CHANNELS.IMPORT_PARSE_EMAIL, async (_, emailText: string, broker: string) => {
    try {
      return importService.parseEmailText(emailText, broker);
    } catch (error) {
      console.error('Error parsing email:', error);
      throw error;
    }
  });
}
