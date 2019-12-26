import IPlugin from "./IPlugin";

export interface IFile {
    name: string;
    content?: string;
    //contentJson?: any;
    children: IFile[];
    isDir: boolean;
    path: string;
}

export interface IOptions {
    modules: string[];
    path: string;
    projectName: string;
    templateVariable: any;
    ts: boolean;
}

const fs = require('fs');
const path = require('path');
const commander = require('commander');
const download = require('download-git-repo');
const inquirer = require('inquirer');
const colors = require('colors');
const ora = require('ora');
import config from './config';

export default class CliRuntime {
    template: IFile = {name: "", children: [], isDir: true, path: ""};
    plugins: IPlugin[] = [];

    //modules: any = {fs,path,commander};
    constructor(public options: IOptions, public spinner: any, public colors: any) {

    }

    get projectPath() {
        const {path: basePath, projectName} = this.options;
        return path.resolve(basePath, projectName);
    }

    get projectPluginsPath() {
        return path.resolve(this.projectPath, "react-app-cli-plugins");
    }

    getProjectPluginPath(pluginName: string) {
        return path.resolve(this.projectPluginsPath, `${pluginName}.js`);
    }

    downloadGit(repo: string, dest: string, opts: any = {clone: true}) {
        return new Promise((resolve, reject) => {
            download(repo, dest, opts, function (err: any) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            })
        });
    }

    loadFiles(dir: string, filename: string): IFile {
        const filePath = path.resolve(dir, filename);
        const stats = fs.statSync(filePath);
        if (stats.isDirectory()) {
            const children: IFile[] = [];
            const dirs = fs.readdirSync(filePath);
            for (const dir of dirs) {
                children.push(this.loadFiles(filePath, dir));
            }
            return {isDir: true, children, name: filename, path: filePath};
        } else {
            let content = this.replaceVariable(fs.readFileSync(filePath, 'utf-8'));
            return {isDir: false, children: [], content, name: filename, path: filePath};
        }
    }

    replaceVariable(content?: string) {
        if (content) {
            for (const key in this.options.templateVariable) {
                const value = this.options.templateVariable[key];
                content = content.replace(new RegExp(`<cli>${key}</cli>>`, "gm"), value);
            }
        }
        return content;
    }

    async init() {
        const {path: basePath, projectName} = this.options;
        if (fs.existsSync(this.projectPath)) {
            throw `${projectName}项目已经存在于${basePath}`;
        }
        this.spinner.text = "项目模版下载中...";
        await this.downloadGit(this.options.ts ? config.templateTsUrl : config.templateUrl, this.projectPath);
        this.spinner.stop();
        const promptList = require(path.resolve(this.projectPath, "templateVariable.js"));
        const answers = await inquirer.prompt(promptList);
        Object.assign(this.options.templateVariable, answers);
        this.spinner.start();
        this.spinner.text = "项目文件初始化中...";
        this.template = this.loadFiles(basePath, projectName);
        this.spinner.text = "项目所需插件下载中...";
        await this.downloadGit(config.pluginsUrl, this.projectPluginsPath);
        for (const pluginName of this.options.modules) {
            try {
                this.plugins.push(require(this.getProjectPluginPath(pluginName)));
            } catch (e) {
                console.log(this.colors.warn(`\n插件${pluginName}找不到或者加载错误`));
            }
        }
        this.plugins.sort(({order: orderA = 0}, {order: orderB = 0}) => {
            return orderB - orderA;
        });
    }

    getWebpackConfigFile(dev?: boolean) {
        const {children} = this.template;
        const configs = children.find((file) => file.name === "config");
        if (configs && configs.children) {
            const flag = dev ? "dev" : "prod";
            return configs.children.find(file => file.name === `webpack.${flag}.js`)
        }
    }

    getPackageJsonFile() {
        const {children} = this.template;
        return children.find((file) => file.name === "package.json");
    }

    async triggerEvent(event: string, args?: any) {
        for (const plugin of this.plugins) {
            if (plugin.events) {
                if (plugin.events instanceof Array && plugin.events.indexOf(event) < 0) {
                    continue;
                }
                plugin.on && await plugin.on("cli_start", this, args);
            }
        }
    }

    async run() {
        this.spinner.text = "插件模版生成中...";
        await this.triggerEvent("cli_start");
        for (const plugin of this.plugins) {
            this.spinner.text = `${plugin.name}插件模版生成中...`;
            await plugin.apply(this);
        }
        this.spinner.text = "插件模版生成中完毕";
        await this.triggerEvent("cli_end");
        this.spinner.text = "模版文件刷新中...";
        await this.flushTemplate();
        await this.triggerEvent("cli_destroy");
    }

    async flushTemplate(file: IFile = this.template) {
        const {children, isDir, path, content} = file;
        if (isDir) {
            if (!fs.existsSync(path)) {
                fs.mkdirSync(path);
            }
        } else {
            fs.writeFileSync(path, content);
        }
        for (const file of children) {
            this.flushTemplate(file);
        }
    }
}
