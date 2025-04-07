import {spawn} from "node:child_process";
import {ApiConstants} from "./ApiConstants";
import {extensions, OutputChannel, window, workspace, WorkspaceConfiguration} from "vscode";
import {logData} from "./utils";

export class MapBuilderJavaProcess {
    mapBuilderValidationLogger: OutputChannel;
    config: WorkspaceConfiguration;
    private extensionPublisher: string = 'aphp.fhir-mapbuilder';


    constructor(validationOutputChannel: OutputChannel) {
        this.mapBuilderValidationLogger = validationOutputChannel;
        this.config = workspace.getConfiguration('MapBuilder');
    }

    public start(): void {
        const {command, args} = this.buildShellCommand();
        window.showInformationMessage("Starting matchbox java process");
        logData(`Starting java process - cmd: ${command} ${args.join(" ")}`, this.mapBuilderValidationLogger);

        const javaProcess = spawn(command, args, {shell: true});

        javaProcess.stdout.on("data", (data) => {
            const logEntry = data.toString();
            this.mapBuilderValidationLogger.appendLine(logEntry);
            const initAppLogMessage = this.extractLogMessage(logEntry);
            if (initAppLogMessage) {
                window.showInformationMessage(initAppLogMessage);
            }
        });

        javaProcess.stderr.on("data", (data) => {
            this.mapBuilderValidationLogger.appendLine(data.toString());
        });

        javaProcess.on("close", (code) => {
            logData(`Java process exited with code ${code}`, this.mapBuilderValidationLogger);
        });

        javaProcess.on("error", (error) => {
            logData(`Error starting Java process, message: ${error.message}`, this.mapBuilderValidationLogger);
        });
    }

    private buildShellCommand() {
        const jarName = this.config.get("jarName") === "" ? "fhir-mapbuilder-validation" : this.config.get("jarName");
        const command = "java"; // Java executable

        const args = [
            `-Dserver.port=${ApiConstants.apiServerPort}`, // Set server port
            `-Dfile.encoding=UTF-8`,
            "-jar",
            `${extensions.getExtension(this.extensionPublisher)?.extensionPath}\\target\\${jarName}.jar`
        ];

        let workspaceFolders = workspace.workspaceFolders;
        if (workspaceFolders && workspaceFolders.length > 0) {
            const packagePath = `${workspaceFolders[0].uri.fsPath}\\output\\package.tgz`;
            const IncludeWorkingPackage = this.config.get("IncludeWorkingPackage") ?? true;

            // Add IG package path if needed
            if (IncludeWorkingPackage) {
                args.push("-ig", packagePath);
            }
        }

        return {command, args};
    }

    private extractLogMessage(log: string): string | null {
        const keyword = "Started MatchBoxApplication in";
        const index = log.indexOf(keyword);
        return index !== -1 ? log.substring(index) : null;
    }
}
