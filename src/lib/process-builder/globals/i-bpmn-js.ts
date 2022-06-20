export interface IBpmnJS {
    attachTo: (el: HTMLDivElement) => void;
    get: (module: string) => any;
    importXML: (xml: string) => { warnings: string[] };
    saveXML: () => Promise<{ xml: string }>;
}
