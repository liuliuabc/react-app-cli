import CliRuntime from "./CliRuntime";
export default interface IPlugin{
    name:string,
    description?:string,
    events?:string[]|boolean,
    order?:number,
    apply(runtime:CliRuntime):any;
    on?(event:string,runtime:CliRuntime,args?:any):any;
}
