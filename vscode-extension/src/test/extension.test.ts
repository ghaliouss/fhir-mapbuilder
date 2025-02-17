import * as assert from 'assert';
import * as vscode from 'vscode';
import * as sinon from 'sinon';
import {FmlValidation} from "../FmlValidation";
import {MapBuilderValidationApi} from "../MapBuilderValidationApi";
import {window} from "vscode";

suite('Extension Test Suite', () => {
    vscode.window.showInformationMessage('Start Global tests.');

    test('Extension should be present', () => {
        const extension = vscode.extensions.getExtension('aphp.map-builder');
        assert.ok(extension, 'Extension is not registered in VSCode');
    });

    test('Extension should activate on FML file', async () => {
        const extension = vscode.extensions.getExtension('aphp.map-builder');
        if (!extension) {
            assert.fail('Extension not found');
        }

        const document = await vscode.workspace.openTextDocument({language: 'fml', content: ''});
        await vscode.window.showTextDocument(document);

        // Wait for the extension to be activated
        await vscode.extensions.getExtension('aphp.map-builder')?.activate();

        assert.ok(extension.isActive, 'Extension did not activate when an FML file was opened');
    });


});

suite('Extension Commands Test Suite', () => {

    let showWarningMessageStub: sinon.SinonStub;
    let showInformationMessageStub: sinon.SinonStub;
    let showErrorMessageStub: sinon.SinonStub;
    let isPackagePathStub: sinon.SinonStub;
    let fmlValidationInstance: FmlValidation;
    let mockApi: MapBuilderValidationApi;



    setup(() => {
        // Stub the warning message dialog
        showWarningMessageStub = sinon.stub(vscode.window, 'showWarningMessage').resolves(undefined);
        // Stub the error message dialog
        showErrorMessageStub = sinon.stub(vscode.window, 'showErrorMessage').resolves(undefined);
        // Stub the information message dialog
        showInformationMessageStub = sinon.stub(window, 'showInformationMessage');

        // Mock the API
        mockApi = sinon.createStubInstance(MapBuilderValidationApi);

        // Create an instance of FmlValidation with mocked dependencies
        fmlValidationInstance = new FmlValidation(vscode.window.createOutputChannel('test'), mockApi);

        // Stub the isPackagePath method to always return true
        isPackagePathStub = sinon.stub(fmlValidationInstance, 'isPackagePath').resolves(true);


    });

    teardown(() => {
        // Restore all stubs
        showWarningMessageStub.restore();
        showErrorMessageStub.restore();
        showInformationMessageStub.restore();
        isPackagePathStub.restore();

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




});
