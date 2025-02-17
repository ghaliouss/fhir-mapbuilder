import * as vscode from 'vscode';
import {OutputChannel} from 'vscode';
import {FmlCompletionProvider} from './FmlCompletionProvider';
import {FhirDefinition} from './FhirDefinition';
import {FmlValidation} from './FmlValidation';
import {MapBuilderJavaProcess} from "./MapBuilderJavaProcess";
import {MapBuilderValidationApi} from "./MapBuilderValidationApi";

const FML_MODE = {language: 'fml', scheme: 'file'};

function getMapBuilderValidationApi(validationOutputChannel: OutputChannel) {
    const mapBuilderJavaProcess = new MapBuilderJavaProcess(validationOutputChannel);

    const api = new MapBuilderValidationApi(validationOutputChannel);
    api.isAppRunning().then(isAppRunning => {
        if (!isAppRunning) {
            mapBuilderJavaProcess.start();
        }
    });
    return api;
}

export function activate(context: vscode.ExtensionContext): {
    completionProviderInstance: FmlCompletionProvider | null
} {

    try {
        const principalChannel = vscode.window.createOutputChannel("MapBuilder");
        const detailsChannel = vscode.window.createOutputChannel("MapBuilderValidation");

        const api = getMapBuilderValidationApi(detailsChannel);

        const [, completionProviderInstance] = addAutoComplete(principalChannel, context);

        addFMLTemplate(context);

        addValidationCommand(principalChannel, detailsChannel, api, context);

        addValidationWithDefaultFilesCommand(principalChannel, detailsChannel, api, context);

        addValidationAfterLoadingPackageCommand(principalChannel, detailsChannel, api, context);

        return {completionProviderInstance};

    } catch (err) {
        return {completionProviderInstance: null};
    }
}

export function deactivate() {
    const validationOutputChannel = vscode.window.createOutputChannel("MapBuilderValidation");
    const api = new MapBuilderValidationApi(validationOutputChannel);
    api.callShutDownProcess();

}

export function addAutoComplete(outputChannel: OutputChannel, context: vscode.ExtensionContext): [FhirDefinition, FmlCompletionProvider] {
    const fhirDefinitionInstance = new FhirDefinition(outputChannel);
    const completionProviderInstance = new FmlCompletionProvider(fhirDefinitionInstance, outputChannel);

    context.subscriptions.push(
        vscode.languages.registerCompletionItemProvider(FML_MODE, completionProviderInstance, '.')
    );

    return [fhirDefinitionInstance, completionProviderInstance];
}

export function addFMLTemplate(context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('mapbuilder.InsertTemplate', () => {
        if (vscode.window.activeTextEditor) {
            vscode.languages.setTextDocumentLanguage(vscode.window.activeTextEditor.document, FML_MODE.language as string);
            vscode.commands.executeCommand("editor.action.insertSnippet", {"name": "Template"});
        }
    }));
}

export function addValidationCommand(outputChannel: OutputChannel, validationOutputChannel: OutputChannel, mapBuilderValidationApi: MapBuilderValidationApi, context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('mapbuilder.Validation', async () => {

        const fmlValidation = new FmlValidation(outputChannel, mapBuilderValidationApi);
        await fmlValidation.validateWithPossibilityToChooseFiles();
    }));
}

export function addValidationWithDefaultFilesCommand(outputChannel: OutputChannel, validationOutputChannel: OutputChannel, mapBuilderValidationApi: MapBuilderValidationApi, context: vscode.ExtensionContext) {
    context.subscriptions.push(vscode.commands.registerCommand('mapbuilder.ValidationWithDefaultFiles', async () => {

        const fmlValidation = new FmlValidation(outputChannel, mapBuilderValidationApi);
        await fmlValidation.validateWithDefaultFiles();

    }));
}

export function addValidationAfterLoadingPackageCommand(
    outputChannel: OutputChannel,
    validationOutputChannel: OutputChannel,
    mapBuilderValidationApi: MapBuilderValidationApi,
    context: vscode.ExtensionContext
) {
    context.subscriptions.push(
        vscode.commands.registerCommand(
            'mapbuilder.ValidationAfterLoadingPackage',
            async () => {
                const fmlValidation = new FmlValidation(outputChannel, mapBuilderValidationApi);
                const isPackagePath = await fmlValidation.checkPackagePath();
                if(isPackagePath){
                    await fmlValidation.loadPackage();
                    await fmlValidation.validateWithPossibilityToChooseFiles();
                }
            }
        )
    );
}

