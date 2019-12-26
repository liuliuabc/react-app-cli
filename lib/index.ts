import CliRuntime from "./CliRuntime";
const program = require('commander');
const packageInfo = require('../package.json');
const ora = require('ora');
const colors = require('colors/safe');
const fs = require('fs');
const path = require('path');
colors.setTheme({
    silly: 'rainbow',
    input: 'grey',
    verbose: 'cyan',
    prompt: 'grey',
    info: 'green',
    data: 'grey',
    help: 'cyan',
    warn: 'yellow',
    debug: 'blue',
    error: 'red'
});
program.version(packageInfo.version);
program.option(`-b, --base [name]`, "add any modules like mobx+antd","mobx+antd");
program.option(`-t, --typescript`, "create project with typescript");
program.on('--help', function (){
    console.log('')
    console.log('Examples:');
    console.log(colors.info('  $ react-app-cli init react-demo'));
    console.log(colors.info('  $ react-app-cli init react-demo -b antd+mobx'));
});
program
    .command('init <name>')
    //.option(`-f, --file <name>`, "init program by file")
    .description('init a react project')
    .action(async function (projectName:string){
        const spinner = ora('Loading unicorns').start("项目初始化中...");
        try {
            const {base = "",typescript} = program;
            let modules = base.split("+");
            //拉取并读取git仓库模版，webpack，package.json文件
            //拉取并读取git仓库所有插件
            //mkdir name
            //cd name
            const templateVariable={projectName};
            const options = {modules, projectName, path: "/Users/lyh/Work/Self",templateVariable,ts:typescript};
            //const options = {modules, projectName, path: __dirname};
            const runtime = new CliRuntime(options,spinner,colors);
            await runtime.init();
            await runtime.run();
            spinner.succeed("恭喜您，项目创建成功");
        } catch (e) {
            console.log(e);
            const message=typeof e==="object"?e.message:e;
            spinner.fail(message);
        }
    });
program.parse(process.argv);

