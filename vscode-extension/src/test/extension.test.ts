import * as assert from 'assert';
import * as vscode from 'vscode';
import {window} from 'vscode';
import * as sinon from 'sinon';
import {FmlValidation} from "../FmlValidation";
import {MapBuilderValidationApi} from "../MapBuilderValidationApi";
import {MapBuilderWatcher} from "../MapBuilderWatcher";
import {UiConstants} from "../constants/UiConstants";

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start Global tests.');

    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension(UiConstants.extensionPublisher);
        assert.ok(extension, 'Extension is not registered in VSCode');
    });

    test('Extension should activate on FML file', async () => {
        const extension = vscode.extensions.getExtension(UiConstants.extensionPublisher);
        if (!extension) {
            assert.fail('Extension not found');
        }

        const document = await vscode.workspace.openTextDocument({language: 'fml', content: ''});
        await vscode.window.showTextDocument(document);

        // Wait for the extension to be activated
        await vscode.extensions.getExtension(UiConstants.extensionPublisher)?.activate();

        assert.ok(extension.isActive, 'Extension did not activate when an FML file was opened');
    });


});

suite('Extension Commands Test Suite', () => {

    let showWarningMessageStub: sinon.SinonStub;
    let showInformationMessageStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    //  let isPackagePathStub: sinon.SinonStub;
    let fmlValidationInstance: FmlValidation;
    let mapBuilderWatcherInstance: MapBuilderWatcher;
    let mockApi: MapBuilderValidationApi;
    let fmlFileWatcherOnStub: sinon.SinonStub;
    let emitManuallyAddEventStub: sinon.SinonStub;
    let emitOpenFileDialogStub: sinon.SinonStub;


    setup(() => {
        // Stub the warning message dialog
        showWarningMessageStub = sinon.stub(vscode.window, 'showWarningMessage').resolves(undefined);
        // Stub the error message dialog
        showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage').resolves(undefined);
        // Stub the information message dialog
        showInformationMessageStub = sinon.stub(window, 'showInformationMessage');

        // Mock the API
        mockApi = sinon.createStubInstance(MapBuilderValidationApi);

        fmlValidationInstance = new FmlValidation(vscode.window.createOutputChannel('test'), mockApi);
        //  isPackagePathStub = sinon.stub(fmlValidationInstance, 'isPackagePath').resolves(true);


        // Stub chokidar.watch before instantiating the watcher
        fmlFileWatcherOnStub = sinon.stub();

        mapBuilderWatcherInstance = new MapBuilderWatcher(vscode.window.createOutputChannel('test'), mockApi);
        sinon.stub(mapBuilderWatcherInstance, 'parseAllFmlFiles').resolves(0);

    });

    teardown(() => {
        // Restore all stubs
        sinon.restore();
    });


    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        const expectedCommands = [
            'fhirMapBuilder.InsertTemplate',
            'fhirMapBuilder.Validation',
            'fhirMapBuilder.ValidationWithDefaultFiles',
            'fhirMapBuilder.ValidationAfterLoadingPackage'
        ];
        for (const command of expectedCommands) {
            assert.ok(commands.includes(command), `Command ${command} is not registered`);
        }
    });

    test('InsertTemplate Command should execute successfully', async () => {
        const command = 'fhirMapBuilder.InsertTemplate';
        try {
            await vscode.commands.executeCommand(command);
            assert.ok(true, `Command ${command} executed successfully`);
        } catch (error) {
            assert.fail(`Command ${command} execution failed`);
        }

    });



    test('validateWithDefaultFiles should show an error message when validation fails', async () => {

        // Call the validateWithDefaultFiles method
        await fmlValidationInstance.validateWithDefaultFiles();

        // Check that the error message was shown
        const expectedErrorMessage = 'Validation error occurred.';
        assert.ok(
            showErrorMessageStub.calledWith(expectedErrorMessage),
            `Expected message "${expectedErrorMessage}" should be shown when validation fails.`
        );

        // Check that no success message was shown
        const expectedSuccessMessage = 'Validation completed successfully.';
        assert.ok(
            !showInformationMessageStub.calledWith(expectedSuccessMessage),
            `Expected message "${expectedSuccessMessage}" should not be shown when validation fails.`
        );

    });



    test('validateWithDefaultFiles should show an error message when validation error occured', async () => {
        // Call the validateWithDefaultFiles method which internally calls isPackagePath
        await fmlValidationInstance.validateWithDefaultFiles();
        // Check that no error message was shown
        const expectedErrorMessage = 'Validation error occurred.';
        assert.ok(
            showErrorMessageStub.calledWith(expectedErrorMessage),
            `Expected message "${expectedErrorMessage}" should not be shown when validation is successful.`
        );
    });
});
