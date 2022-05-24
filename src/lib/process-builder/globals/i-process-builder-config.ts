import { InjectionToken } from "@angular/core";

export interface IProcessBuilderConfig {
    'editable': boolean;
    'hideEvents': boolean;
    'hideTasks': boolean;
    'hideGateways': boolean;
    'hideSubProcesses': boolean;
    'hideDataObjectReferences': boolean;
    'hideDatabases': boolean;
    'hidePools': boolean;
    'hideGroups': boolean;
}

export const PROCESS_BUILDER_CONFIG_TOKEN: InjectionToken<IProcessBuilderConfig> = new InjectionToken<IProcessBuilderConfig>("PROCESS_BUILDER_CONFIG");
