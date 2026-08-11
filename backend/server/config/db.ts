import { executeQuery } from '../../services/bd_connection.service';
import { TipoConsulta, Parametros, ParamsWebServiceAD } from '../../interfaces/params_web_service';
import { validationMicrosoftAccountAD as validationMicrosoftAccountADService } from '../../services/bd_authentication';
import { executeQuery_BinaryFile } from '../../services/bd_connectionBinaryFile.service';

export type DB = {
  safeExecute: (sql: string) => Promise<any[]>;
  safeRun: (sql: string) => Promise<void>;
  executeConnection: <T>(sql: string, tipoConsulta:TipoConsulta, params:Parametros[]) => Promise<T[]>;
  validationMicrosoftAccountAD: <T>(params: ParamsWebServiceAD) => Promise<T> ;
  executeConnection_FileBinary: <T>(sql: string, tipoConsulta:TipoConsulta, params:Parametros[], datoBinario:string) =>  Promise<T[]>;
};

export function createDb(): DB {
  return {
    async safeExecute(sql: string): Promise<any[]> {
      const result = await executeQuery({
        TipoConsulta: TipoConsulta.Consulta,
        Consulta: sql,
        Parametros: [],
      });

      if (!result.isSuccess) {
        throw new Error(result.errorMessage ?? 'Query failed');
      }

      return result.data;
    },

    async safeRun(sql: string): Promise<void> {
      const result = await executeQuery({
        TipoConsulta: TipoConsulta.Consulta,
        Consulta: sql,
        Parametros: [],
      });

      if (!result.isSuccess) {
        throw new Error(result.errorMessage ?? 'Execute failed');
      }
    },

    async executeConnection<T>(sql: string, tipoConsulta:TipoConsulta, params:Parametros[]): Promise<T[]> {
      try {
        const result = await executeQuery({
          TipoConsulta: tipoConsulta,
          Consulta: sql,
          Parametros: params,
        });
    
        if (!result.isSuccess) {
          throw new Error(result.errorMessage ?? 'Query failed');
        }
    
        return result.data as T[];
      } catch (error: any) {
        throw new Error(
          error?.message ?? "Error al ejecutar conexión"
        );
      }
    },

    async validationMicrosoftAccountAD<T>(params:ParamsWebServiceAD): Promise<T> {
      try {                
          const result = await validationMicrosoftAccountADService({
          cuenta: params.cuenta,
          password: params.password
        });
        
        if (!result.isSuccess) {
          throw new Error(result.errorMessage ?? 'Query failed');
        }
    
        return result.data[0] as T;
      } catch (error: any) {
        throw new Error(
          error?.message ?? "Error al ejecutar conexión"
        );
      }
    },

    async executeConnection_FileBinary<T>(sql: string, tipoConsulta:TipoConsulta, params:Parametros[], datoBinario:string
      
    ): Promise<T[]> {
      try {
        const result = await executeQuery_BinaryFile({
          TipoConsulta: tipoConsulta,
          Consulta: sql,
          Parametros: params,
          Binario: datoBinario
        });
    
        if (!result.isSuccess) {
          throw new Error(result.errorMessage ?? 'Query failed');
        }
    
        return result.data as T[];
      } catch (error: any) {
        
        throw new Error(
          error?.message ?? "Error al ejecutar conexión"
        );
      }
    },
  };
}