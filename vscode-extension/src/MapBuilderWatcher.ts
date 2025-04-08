import vscode, {OutputChannel, workspace, WorkspaceConfiguration} from "vscode";
import {MapBuilderValidationApi} from "./MapBuilderValidationApi";
import * as chokidar from "chokidar";
import {FSWatcher} from "chokidar";
import fs from "fs";
import {executeWithProgress} from "./utils";
import {UiConstants} from "./constants/UiConstants";


export class MapBuilderWatcher {
    logger: OutputChannel;
    config: WorkspaceConfiguration;
    api: MapBuilderValidationApi;
    fmlFileWatcher: FSWatcher;


    constructor(outputChannel: OutputChannel, mapBuilderValidationApi: MapBuilderValidationApi) {
        this.logger = outputChannel;
        this.config = workspace.getConfiguration(UiConstants.configName);
        this.api = mapBuilderValidationApi;
        this.fmlFileWatcher = this.createFmlFileWatcher();
    }


    public watchIgPackage() {
        const packagePath = `${this.getRootPath()}${UiConstants.packageRelativePath}`;

        if (!fs.existsSync(packagePath)) {
            vscode.window.showErrorMessage(`Folder does not exist: ${packagePath}`);
            return;
        }

        const packageWatcher = chokidar.watch(packagePath, {
            persistent: true,
            ignoreInitial: true
        });

        const handlePackageChange = async () => {
            await executeWithProgress("Loading new package in progress...", async () => {
                const message = await this.api.callResetAndLoadEngine();
                if (message) {
                    vscode.window.showInformationMessage(message);
                    this.emitManuallyAddEvent();
                } else {
                    vscode.window.showErrorMessage('Cannot load package');
                }
            });
        };

        packageWatcher.on('change', handlePackageChange);
        packageWatcher.on('add', handlePackageChange);
    }


    public watchFmlFiles() {
        const handleFileEvent = async (filePath: string, eventType: 'add' | 'change') => {
            if (!filePath.endsWith('.fml')) {
                return;
            }
            const result = await this.api.callParseStructureMap(filePath);
            if (result) {
                const message =
                    eventType === 'add'
                        ? `New file detected: ${filePath}. The StructureMap has been parsed.`
                        : `File updated: ${filePath}. As a result, the StructureMap has been parsed.`;
                vscode.window.showInformationMessage(message);
            } else {
                vscode.window.showErrorMessage(`Error parsing StructureMap in file ${filePath}.`);
            }
        };

        this.fmlFileWatcher.on('change', (filePath) => handleFileEvent(filePath, 'change'));
        this.fmlFileWatcher.on('add', (filePath) => handleFileEvent(filePath, 'add'));
    }

    private createFmlFileWatcher(): FSWatcher {
        const rootPath = this.getRootPath();
        const watcher = chokidar.watch(rootPath, {
            persistent: true,
            ignoreInitial: false,
            depth: Infinity
        });
        return watcher;
    }

    private getRootPath() {
        let workspaceFolders = workspace.workspaceFolders;
        let packagePath = "";
        if (workspaceFolders && workspaceFolders.length > 0) {
            packagePath = `${workspaceFolders[0].uri.fsPath}`;
        }
        return packagePath;
    }

    private emitManuallyAddEvent() {
        const rootPath = this.getRootPath();
        fs.readdir(rootPath, (err, files) => {
            if (err) {
                console.error(`Error reading directory: ${err}`);
                return;
            }

            files
                .filter(file => file.endsWith('.fml'))
                .forEach(file => {
                    const filePath = `${rootPath}\\${file}`;
                    this.fmlFileWatcher.emit('add', filePath);
                });
        });
    }
}
