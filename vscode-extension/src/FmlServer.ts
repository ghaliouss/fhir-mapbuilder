import { 
	ConfigurationTarget,
	extensions,
    OpenDialogOptions,
    OutputChannel,
    Terminal,
    window,
	workspace,
	WorkspaceConfiguration
} from "vscode";
import os from 'os';
import fs from 'fs';
import YAML from 'yaml';


export class FmlServer {
    logger : OutputChannel;
    serverTerminal! : Terminal;
    config : WorkspaceConfiguration;
    cmdExec: string = 'java -jar ';
    matchboxPort: number = 8081;
    outputFolderName = `fml-generated`;
    outputPath = os.homedir();


    constructor(outputChannel : OutputChannel) {
        this.logger = outputChannel;
        this.config = workspace.getConfiguration('MapBuilder');
        this.matchboxPort = this.config.get("matchboxPort") === undefined ? 8081 : this.config.get("matchboxPort") as number;
        let workspaceFolders = workspace.workspaceFolders;
        this.outputPath = workspaceFolders ? workspaceFolders[0].uri.fsPath : os.homedir();
    }

    public startServer() {
        this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : Begin startServer()`);
        const openTerminal = window.terminals.find(terminal => terminal.name === "Server FML");
        if (openTerminal !== undefined) {
            openTerminal.dispose();
        }
        this.serverTerminal = window.createTerminal('Server FML');

        this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : Start retrieve configuration`);
		this.config = workspace.getConfiguration('MapBuilder');
		this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : End retrieve configuration`);

        //retrieve configuration values
        this.matchboxPort = this.config.get("matchboxPort") === undefined ? 8081 : this.config.get("matchboxPort") as number;

        // Build command
        let cmd = `${this.cmdExec} ${extensions.getExtension('AP-HP.map-builder')?.extensionPath}\\target\\matchbox.jar `;

        // Change port
        cmd += `--server.port=${this.matchboxPort} `;

        // Change DB path use home dir for base path
        cmd += `--spring.datasource.url=jdbc:h2:mem:mapbuilder;DB_CLOSE_DELAY=-1`;

        this.serverTerminal.sendText(cmd);
        this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : The server is starting up`);
        this.serverTerminal.show();
        this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : End startServer()`);
    }

    
    public stopServer() {
        this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : Begin stopServer()`);
        const openTerminal = window.terminals.find(terminal => terminal.name === "Server FML");
        if (openTerminal !== undefined) {
            openTerminal.dispose();
        }
        this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : End stopServer()`);
    }

    public async sendWorkingPackage() {
        let workspaceFolders = workspace.workspaceFolders;
		let packagePath = "";
		if (workspaceFolders && workspaceFolders.length > 0) {
			packagePath = `${workspaceFolders[0].uri.fsPath}\\output\\package.tgz`;
		}

		let fileIsPresent : boolean = await this.fileExist(packagePath);

		if(!fileIsPresent) {
			await window.showErrorMessage(
				"Please build the Implementation Guide from your working repository, to use it for validation. (working_repository\\output\\package.tgz)",
				{ modal: true }
			);
			return;
		}

        const [idIG, versionIG] = await this.retrieveSushiConfig();
        this.matchboxPort = this.config.get("matchboxPort") === undefined ? 8081 : this.config.get("matchboxPort") as number;

        try {
            const fileStream = fs.createReadStream(packagePath);
            this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : Call http://localhost:${this.matchboxPort}/matchboxv3/fhir/$install-npm-package?name=${idIG}&version=${versionIG}`);

            const response = await fetch(`http://localhost:${this.matchboxPort}/matchboxv3/fhir/$install-npm-package?name=${idIG}&version=${versionIG}`, {
                method: 'POST',
                body: fileStream,
                headers: {
                  'Content-Type': 'application/gzip',
                },
                duplex: 'half',
              });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const data = await response.json();
            const filePath = this.createOrRetrievePathFolder() + `${this.formatDate(new Date)}_packageSend.json`;
            fs.writeFileSync(filePath, JSON.stringify(data));
            await window.showInformationMessage(
                `Data can be found here : ${filePath}`,
                { modal: true }
            );            
        } catch (error) {
            await window.showErrorMessage(
				"Error : " + error,
				{ modal: true }
			);
        }
    }

    public async retrieveSushiConfig() : Promise<[string, string]> {
        const configFiles = await workspace.findFiles('sushi-config.{yaml,yml}');
        if (configFiles.length > 0) {
            try {
                const configContents = await workspace.fs.readFile(configFiles[0]);
                const decoder = new TextDecoder();
                const decodedConfig = decoder.decode(configContents);
                const parsedConfig = YAML.parse(decodedConfig);
                return [parsedConfig.id, parsedConfig.version];
            } catch(error) {
                this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : there was a problem parsing the configuration`);
            }
        }
        return ["", ""];
    }

    public async sendMetadataRequest() {
        try {
            const response = await fetch(`http://localhost:${this.matchboxPort}/matchboxv3/fhir/metadata`);
            const data = await response.json();
            const filePath = this.createOrRetrievePathFolder() + `${this.formatDate(new Date)}_metadata.json`;
            fs.writeFileSync(filePath, JSON.stringify(data));
            await window.showInformationMessage(
                `Data can be found here : ${filePath}`,
                { modal: true }
            );
        } catch (error) {
            await window.showErrorMessage(
				"Error : " + error,
				{ modal: true }
			);
        }
    }

    public async fileExist(path : string) : Promise<boolean> {
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

    public async sendCurrentFML(){
        let editor = window.activeTextEditor;
        if (editor) {
            let targetPath = editor.document.uri.path;
            if(targetPath.charAt(0) === "/") {
                targetPath = targetPath.replace("/", "");
            }
            this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : Start Validation for file ${targetPath.replaceAll("/", "\\")}`);

            this.matchboxPort = this.config.get("matchboxPort") === undefined ? 8081 : this.config.get("matchboxPort") as number;

            try {
                const fileStream = fs.createReadStream(targetPath);
                this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : Call http://localhost:${this.matchboxPort}/matchboxv3/fhir/StructureMap`);

                const response = await fetch(`http://localhost:${this.matchboxPort}/matchboxv3/fhir/StructureMap`, {
                    method: 'POST',
                    body: fileStream,
                    headers: {
                    'Content-Type': 'text/fhir-mapping',
                    },
                    duplex: 'half',
                });
                
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }

                const data = await response.json();
                const filePath = this.createOrRetrievePathFolder() + `${this.formatDate(new Date)}_addStructureMap.json`;
                fs.writeFileSync(filePath, JSON.stringify(data));
                await window.showInformationMessage(
                    `Data can be found here : ${filePath}`,
                    { modal: true }
                );            
            } catch (error) {
                await window.showErrorMessage(
                    "Error : " + error,
                    { modal: true }
                );
            }
        }
    }

    public async sendTransformData(){
        let messageToShow = "";
		if(this.config.get("dataFile") === "") {
			messageToShow = "Data file is not defined in the config. Would you like to choose json file ?";
		} else {
			messageToShow = `Data file is defined in the config (${this.config.get("dataFile")}). Do you want to keep it for the transformation ?`;
		}

		let result = await window.showInformationMessage(
			messageToShow,
			{ modal: true },
			'Yes',
			'No'
		);
		
		let keepGoing : boolean = false;
		if(this.config.get("dataFile") === "") {
			if (result === "Yes") {
				keepGoing = await this.openFileDialog();
			}
		} else {
			if(result === "Yes") {
				keepGoing = true;
			} else if (result === "No") {
				keepGoing = await this.openFileDialog();
			}
		}

        if (keepGoing) {
            this.matchboxPort = this.config.get("matchboxPort") === undefined ? 8081 : this.config.get("matchboxPort") as number;

            try {
                const dataFile = this.config.get("dataFile");
                const fileStream = fs.createReadStream(dataFile as string);

                let editor = window.activeTextEditor;
                if (editor) {
                    let targetPath = editor.document.uri.path;
                    if(targetPath.charAt(0) === "/") {
                        targetPath = targetPath.replace("/", "");
                    }
                    const mapName = fs.readFileSync(targetPath, 'utf-8').split('\n')[0].split('"')[1];

                    this.logger.appendLine(`${(new Date()).toLocaleString('fr-FR')} : Call http://localhost:${this.matchboxPort}/matchboxv3/fhir/StructureMap/$transform?source=${mapName}`);

                    const response = await fetch(`http://localhost:${this.matchboxPort}/matchboxv3/fhir/StructureMap/$transform?source=${mapName}`, {
                        method: 'POST',
                        body: fileStream,
                        headers: {
                        'Content-Type': 'application/fhir+json',
                        },
                        duplex: 'half',
                    });
                    
                    if (!response.ok) {
                        throw new Error(`HTTP error! status: ${response.status}`);
                    }

                    const data = await response.text();
                    const filePath = this.createOrRetrievePathFolder() + `${this.formatDate(new Date)}_transform.xml`;
                    fs.writeFileSync(filePath, data);
                    await window.showInformationMessage(
                        `Data can be found here : ${filePath}`,
                        { modal: true }
                    );
                }       
            } catch (error) {
                await window.showErrorMessage(
                    "Error : " + error,
                    { modal: true }
                );
            }
        }
    }

    public async openFileDialog() : Promise<boolean> {
		let options: OpenDialogOptions = {
		  canSelectMany: false,
		  filters: {
			'Json': ['json']
		  }
		};
	  
		let fileUri = await window.showOpenDialog(options);
		
		if (fileUri && fileUri[0]) {
		  let filePath = fileUri[0].fsPath;
		  window.showInformationMessage(`Selected file: ${filePath}`);
		  await this.config.update("dataFile", filePath, ConfigurationTarget.Global);
		  this.config = workspace.getConfiguration('MapBuilder');
		  return true;
		}

		return false;
	}

    public createOrRetrievePathFolder() : String {
		const path = `${this.outputPath}\\${this.outputFolderName}\\`;
		if (!fs.existsSync(path)){
			fs.mkdirSync(path);
		}
        return path;
	}

    public formatDate(date: Date): string {
        const pad = (num: number) => num.toString().padStart(2, '0');
        const year = date.getFullYear();
        const month = pad(date.getMonth() + 1);
        const day = pad(date.getDate());
        const hours = pad(date.getHours());
        const minutes = pad(date.getMinutes());
        const seconds = pad(date.getSeconds());
        
        return `${year}_${month}_${day}_${hours}_${minutes}_${seconds}`;
      }

}