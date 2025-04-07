import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import * as chokidar from 'chokidar';
import {FmlValidation} from "../FmlValidation";
import {MapBuilderValidationApi} from "../MapBuilderValidationApi";
import {window} from "vscode";
import {MapBuilderWatcher} from "../MapBuilderWatcher";
import fs from "fs";

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start Global tests.');

    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension('aphp.fhir-mapbuilder');
        assert.ok(extension, 'Extension is not registered in VSCode');
    });

    test('Extension should activate on FML file', async () => {
        const extension = vscode.extensions.getExtension('aphp.fhir-mapbuilder');
        if (!extension) {
            assert.fail('Extension not found');
        }

        const document = await vscode.workspace.openTextDocument({language: 'fml', content: ''});
        await vscode.window.showTextDocument(document);

        // Wait for the extension to be activated
        await vscode.extensions.getExtension('aphp.fhir-mapbuilder')?.activate();

        assert.ok(extension.isActive, 'Extension did not activate when an FML file was opened');
    });


});

suite('Extension Commands Test Suite', () => {

    let showWarningMessageStub: sinon.SinonStub;
    let showInformationMessageStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    let isPackagePathStub: sinon.SinonStub;
    let fmlValidationInstance: FmlValidation;
    let mapBuilderWatcherInstance: MapBuilderWatcher;
    let mockApi: MapBuilderValidationApi;
    let fmlFileWatcherOnStub: sinon.SinonStub;
    let emitManuallyAddEventStub: sinon.SinonStub;


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
        isPackagePathStub = sinon.stub(fmlValidationInstance, 'isPackagePath').resolves(true);


        // Stub chokidar.watch before instantiating the watcher
        fmlFileWatcherOnStub = sinon.stub();
        sinon.stub(chokidar, 'watch').returns({
            on: fmlFileWatcherOnStub
        } as any);

        mapBuilderWatcherInstance = new MapBuilderWatcher(vscode.window.createOutputChannel('test'), mockApi);
        emitManuallyAddEventStub = sinon.stub(mapBuilderWatcherInstance as any, 'emitManuallyAddEvent');

    });

    teardown(() => {
        // Restore all stubs
        sinon.restore();
    });


    test('Commands should be registered', async () => {
        const commands = await vscode.commands.getCommands(true);
        const expectedCommands = [
            'mapbuilder.InsertTemplate',
            'mapbuilder.Validation',
            'mapbuilder.ValidationWithDefaultFiles',
            'mapbuilder.ValidationAfterLoadingPackage'
        ];
        for (const command of expectedCommands) {
            assert.ok(commands.includes(command), `Command ${command} is not registered`);
        }
    });

    test('InsertTemplate Command should execute successfully', async () => {
        const command = 'mapbuilder.InsertTemplate';
        try {
            await vscode.commands.executeCommand(command);
            assert.ok(true, `Command ${command} executed successfully`);
        } catch (error) {
            assert.fail(`Command ${command} execution failed`);
        }

    });


    test('validateWithPossibilityToChooseFiles should show an error message when package path is invalid', async () => {
        // Stub the isPackagePath method to return false (simulate invalid path)
        isPackagePathStub.resolves(false);

        // Call the validateWithDefaultFiles method again
        await fmlValidationInstance.validateWithPossibilityToChooseFiles();

        // Check if the error message was shown
        const expectedErrorMessage = "There is no output\\package.tgz file in this project!";

        assert.ok(
            showWarningMessageStub.calledWith(expectedErrorMessage),
            `Expected error message "${expectedErrorMessage}" was not shown`
        );
    });


    test('validateWithDefaultFiles should show error message when validation fails', async () => {

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

    test('validateWithPossibilityToChooseFiles should not show an error message when package is valid', async () => {
        // Call the validateWithDefaultFiles method which internally calls isPackagePath
        await fmlValidationInstance.validateWithPossibilityToChooseFiles();

        // Check if the expected message was shown
        const expectedMessage = "There is no output\\package.tgz file in this project!";

        // Since isPackagePath is mocked to return true, this should not trigger the error message
        assert.ok(
            !showWarningMessageStub.calledWith(expectedMessage),
            `Expected message "${expectedMessage}" should not be shown when the package path is valid.`
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

    test('should parse .fml file on add event', async () => {
        const fakePath = 'test.fml';
        (mockApi.callParseStructureMap as sinon.SinonStub).resolves(true);

        let addHandler: ((filePath: string) => Promise<void>) | undefined;
        fmlFileWatcherOnStub.withArgs('add').callsFake((event, cb) => {
            addHandler = cb;
            return undefined;
        });

        mapBuilderWatcherInstance.watchFmlFiles();

        assert.ok(addHandler, 'Expected addHandler to be registered');
        await addHandler!(fakePath);

        const expectedMessage = `New file detected: ${fakePath}. The StructureMap has been parsed.`;
        assert.ok(
            showInformationMessageStub.calledWith(expectedMessage),
            `Expected message "${expectedMessage}" to be shown when .fml file is added.`
        );
    });

    test('should parse .fml file on change event', async () => {
        const fakePath = 'test.fml';
        (mockApi.callParseStructureMap as sinon.SinonStub).resolves(true);

        let addHandler: ((filePath: string) => Promise<void>) | undefined;
        fmlFileWatcherOnStub.withArgs('change').callsFake((event, cb) => {
            addHandler = cb;
            return undefined;
        });

        mapBuilderWatcherInstance.watchFmlFiles();

        assert.ok(addHandler, 'Expected addHandler to be registered');
        await addHandler!(fakePath);

        const expectedMessage = `File updated: ${fakePath}. As a result, the StructureMap has been parsed.`;
        assert.ok(
            showInformationMessageStub.calledWith(expectedMessage),
            `Expected message "${expectedMessage}" to be shown when .fml file is changed.`
        );
    });


    test('should handle add event and show success message when engine loads', async () => {
        const expectedMessage = `New package loading completed successfully.`;
        (mockApi.callResetAndLoadEngine as sinon.SinonStub).resolves(expectedMessage);

        sinon.stub(fs, 'existsSync').returns(true);

        const fakePackagePath = `output\\package.tgz`;
        let addHandler: ((filePath: string) => Promise<void>) | undefined;
        fmlFileWatcherOnStub.withArgs('add').callsFake((event, cb) => {
            addHandler = cb;
            return undefined;
        });


        mapBuilderWatcherInstance.watchIgPackage();
        assert.ok(addHandler, 'Expected addHandler to be registered');
        await addHandler!(fakePackagePath);

        assert.ok(
            showInformationMessageStub.calledWith(expectedMessage),
            'Expected success message to be shown'
        );
        assert.ok(
            emitManuallyAddEventStub.calledOnce,
            'Expected emitManuallyAddEvent to be called'
        );
    });
});
