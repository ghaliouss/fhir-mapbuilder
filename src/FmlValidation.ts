import vscode, {
    ConfigurationTarget,
    OpenDialogOptions,
    OutputChannel,
    Terminal,
    window,
    workspace,
    WorkspaceConfiguration
} from "vscode";
import fs from 'fs';
import {MapBuilderValidationApi} from "./MapBuilderValidationApi";
import {executeWithProgress, logData} from "./utils";


export class FmlValidation {
    logger: OutputChannel;
    terminal!: Terminal;
    config: WorkspaceConfiguration;
    api: MapBuilderValidationApi;


    constructor(outputChannel: OutputChannel, mapBuilderValidationApi: MapBuilderValidationApi) {
        this.logger = outputChannel;
        this.config = workspace.getConfiguration('MapBuilder');
        this.api = mapBuilderValidationApi;
    }

    public async loadPackage() {

        await executeWithProgress("Loading new package in progress...", async () => {
            const message = await this.api.callResetAndLoadEngine();
            message
                ? vscode.window.showInformationMessage(message)
                : vscode.window.showErrorMessage('Cannot load package');
        });

    }


    public async validateWithDefaultFiles(): Promise<void> {
        this.initTerminalAndConfig();
        logData('Start validation', this.logger);
        await this.performValidation();
    }

    public async validateWithPossibilityToChooseFiles(): Promise<void> {
        this.initTerminalAndConfig();
        logData('Start validation', this.logger);
        await this.checkPackagePathWarningMessage();
        let {editor, keepGoing} = await this.chooseFilesAndContinue();
        if (editor && keepGoing) {
            await this.performValidation();
        }
    }


    public async checkPackagePathWarningMessage() {
        const isPackagePath: boolean = await this.isPackagePath();
        if (!isPackagePath) {
            await window.showWarningMessage(
                "There is no output\\package.tgz file in this project!",
                {modal: true}
            );
            return false;
        }

        return true;
    }

    public async checkPackagePath() {
        const isPackagePath: boolean = await this.isPackagePath();
        if (!isPackagePath) {
            await window.showErrorMessage(
                "There is no output\\package.tgz file in this project!",
                {modal: true}
            );
            return false;
        }

        return true;
    }

    private async performValidation(): Promise<void> {
        await executeWithProgress("Validation in progress...", async () => {
            const result = await this.api.callValidateStructureMap();
            logData('End validation', this.logger);
            if(result){
                window.showInformationMessage('Validation completed successfully.');
            }else{
                window.showErrorMessage('Validation error occurred.');
            }
        });

    }

    private getPackagePath() {
        let workspaceFolders = workspace.workspaceFolders;
        let packagePath = "";
        if (workspaceFolders && workspaceFolders.length > 0) {
            packagePath = `${workspaceFolders[0].uri.fsPath}\\output\\package.tgz`;
        }
        return packagePath;
    }

    private async chooseFilesAndContinue() {
        let editor = window.activeTextEditor;
        let keepGoing: boolean = false;
        if (this.config.get("dataFile") !== "") {
            keepGoing = await this.openFileDialog();
        }
        return {editor, keepGoing};
    }

    private initTerminalAndConfig() {
        const openTerminal = window.terminals.find(terminal => terminal.name === "Validate FML");
        if (openTerminal !== undefined) {
            openTerminal.dispose();
        }
        this.terminal = window.createTerminal('Validate FML');
        logData('Start retrieve configuration', this.logger);
        this.config = workspace.getConfiguration('MapBuilder');
        logData('End retrieve configuration', this.logger);

    }

    public async openFileDialog(): Promise<boolean> {
        let options: OpenDialogOptions = {
            canSelectMany: false,
            filters: {
                'Json': ['json']
            }
        };

        let fileUri = await window.showOpenDialog(options);

        if (fileUri && fileUri[0]) {
            let filePath = fileUri[0].fsPath;
            await this.config.update("dataFile", filePath, ConfigurationTarget.Global);
            this.config = workspace.getConfiguration('MapBuilder');
            return true;
        }

        return false;
    }

    public async isPackagePath(): Promise<boolean> {
        const path: string = this.getPackagePath();
        return new Promise<boolean>(async resolve => {
            fs.access(path.replaceAll(" ", ""), fs.constants.F_OK, (err) => {
                if (err) {
                    resolve(false);
                } else {
                    resolve(true);
                }
            });
        });
    }


}
