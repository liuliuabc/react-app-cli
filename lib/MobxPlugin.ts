import CliRuntime from "./CliRuntime";
import IPlugin from "./IPlugin";
class MobxPlugin implements IPlugin{
    name = "mobx";
    events = ["cli_end", "cli_start"];
    apply(runtime: CliRuntime){

    }
    on(event: string, runtime: CliRuntime){

    }
}
