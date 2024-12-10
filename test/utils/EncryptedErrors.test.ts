import { expect } from "chai";
import { ethers } from "hardhat";

import { createInstance } from "../instance";
import { reencryptEuint8 } from "../reencrypt";
import { getSigners, initSigners } from "../signers";
import { deployEncryptedErrors } from "./EncryptedErrors.fixture";

describe("EncryptedErrors", function () {
  const NO_ERROR_CODE = 0n;

  before(async function () {
    await initSigners();
    this.signers = await getSigners();
    this.instance = await createInstance();
  });

  beforeEach(async function () {
    this.numberErrors = 3;
    const contract = await deployEncryptedErrors(this.signers.alice, this.numberErrors);
    this.encryptedErrorsAddress = await contract.getAddress();
    this.encryptedErrors = contract;
  });

  it("post-deployment", async function () {
    expect(await this.encryptedErrors.errorGetCounter()).to.be.eq(BigInt("0"));
    expect(await this.encryptedErrors.errorGetNumCodesDefined()).to.be.eq(BigInt("3"));

    for (let i = 0; i < 3; i++) {
      const handle = await this.encryptedErrors.connect(this.signers.alice).errorGetCodeDefinition(i);
      expect(await reencryptEuint8(this.signers.alice, this.instance, handle, this.encryptedErrorsAddress)).to.be.eq(i);
    }
  });

  it("errorDefineIf --> true", async function () {
    // True --> errorId=0 has errorCode=2
    const condition = true;
    const targetErrorCode = 2;

    const input = this.instance.createEncryptedInput(this.encryptedErrorsAddress, this.signers.alice.address);
    const encryptedData = await input.addBool(condition).encrypt();

    await this.encryptedErrors
      .connect(this.signers.alice)
      .errorDefineIf(encryptedData.handles[0], encryptedData.inputProof, targetErrorCode);

    const handle = await this.encryptedErrors.connect(this.signers.alice).errorGetCodeEmitted(0);
    expect(await reencryptEuint8(this.signers.alice, this.instance, handle, this.encryptedErrorsAddress)).to.be.eq(
      targetErrorCode,
    );
    expect(await this.encryptedErrors.errorGetCounter()).to.be.eq(BigInt("1"));
  });

  it("errorDefineIf --> false", async function () {
    // False --> errorId=1 has errorCode=0
    const condition = false;
    const targetErrorCode = 2;

    const input = this.instance.createEncryptedInput(this.encryptedErrorsAddress, this.signers.alice.address);
    const encryptedData = await input.addBool(condition).encrypt();

    await this.encryptedErrors
      .connect(this.signers.alice)
      .errorDefineIf(encryptedData.handles[0], encryptedData.inputProof, targetErrorCode);

    const handle = await this.encryptedErrors.connect(this.signers.alice).errorGetCodeEmitted(0);
    expect(await reencryptEuint8(this.signers.alice, this.instance, handle, this.encryptedErrorsAddress)).to.be.eq(
      NO_ERROR_CODE,
    );
    expect(await this.encryptedErrors.errorGetCounter()).to.be.eq(BigInt("1"));
  });

  it("errorDefineIfNot --> true", async function () {
    // True --> errorId=0 has errorCode=0
    const condition = true;
    const targetErrorCode = 2;

    const input = this.instance.createEncryptedInput(this.encryptedErrorsAddress, this.signers.alice.address);
    const encryptedData = await input.addBool(condition).encrypt();

    await this.encryptedErrors
      .connect(this.signers.alice)
      .errorDefineIfNot(encryptedData.handles[0], encryptedData.inputProof, targetErrorCode);

    const handle = await this.encryptedErrors.connect(this.signers.alice).errorGetCodeEmitted(0);
    expect(await reencryptEuint8(this.signers.alice, this.instance, handle, this.encryptedErrorsAddress)).to.be.eq(
      NO_ERROR_CODE,
    );
    expect(await this.encryptedErrors.errorGetCounter()).to.be.eq(BigInt("1"));
  });

  it("errorDefineIf --> false", async function () {
    // False --> errorId=1 has errorCode=2
    const condition = false;
    const targetErrorCode = 2;

    const input = this.instance.createEncryptedInput(this.encryptedErrorsAddress, this.signers.alice.address);
    const encryptedData = await input.addBool(condition).encrypt();

    await this.encryptedErrors
      .connect(this.signers.alice)
      .errorDefineIfNot(encryptedData.handles[0], encryptedData.inputProof, targetErrorCode);

    const handle = await this.encryptedErrors.connect(this.signers.alice).errorGetCodeEmitted(0);
    expect(await reencryptEuint8(this.signers.alice, this.instance, handle, this.encryptedErrorsAddress)).to.be.eq(
      targetErrorCode,
    );
    expect(await this.encryptedErrors.errorGetCounter()).to.be.eq(BigInt("1"));
  });

  it("errorChangeIf --> true --> change error code", async function () {
    // True --> change errorCode
    const condition = true;
    const errorCode = 1;
    const targetErrorCode = 2;

    const input = this.instance.createEncryptedInput(this.encryptedErrorsAddress, this.signers.alice.address);
    const encryptedData = await input.addBool(condition).add8(errorCode).encrypt();

    await this.encryptedErrors
      .connect(this.signers.alice)
      .errorChangeIf(encryptedData.handles[0], encryptedData.handles[1], encryptedData.inputProof, targetErrorCode);

    const handle = await this.encryptedErrors.connect(this.signers.alice).errorGetCodeEmitted(0);
    expect(await reencryptEuint8(this.signers.alice, this.instance, handle, this.encryptedErrorsAddress)).to.be.eq(
      targetErrorCode,
    );
    expect(await this.encryptedErrors.errorGetCounter()).to.be.eq(BigInt("1"));
  });

  it("errorChangeIf --> false --> no change for error code", async function () {
    // False --> no change in errorCode
    const condition = false;
    const errorCode = 1;
    const targetErrorCode = 2;

    const input = this.instance.createEncryptedInput(this.encryptedErrorsAddress, this.signers.alice.address);
    const encryptedData = await input.addBool(condition).add8(errorCode).encrypt();

    await this.encryptedErrors
      .connect(this.signers.alice)
      .errorChangeIf(encryptedData.handles[0], encryptedData.handles[1], encryptedData.inputProof, targetErrorCode);

    const handle = await this.encryptedErrors.connect(this.signers.alice).errorGetCodeEmitted(0);
    expect(await reencryptEuint8(this.signers.alice, this.instance, handle, this.encryptedErrorsAddress)).to.be.eq(
      errorCode,
    );
    expect(await this.encryptedErrors.errorGetCounter()).to.be.eq(BigInt("1"));
  });

  it("errorChangeIfNot --> true --> no change for error code", async function () {
    // True --> no change errorCode
    const condition = true;
    const errorCode = 1;
    const targetErrorCode = 2;

    const input = this.instance.createEncryptedInput(this.encryptedErrorsAddress, this.signers.alice.address);
    const encryptedData = await input.addBool(condition).add8(errorCode).encrypt();

    await this.encryptedErrors
      .connect(this.signers.alice)
      .errorChangeIfNot(encryptedData.handles[0], encryptedData.handles[1], encryptedData.inputProof, targetErrorCode);

    const handle = await this.encryptedErrors.connect(this.signers.alice).errorGetCodeEmitted(0);
    expect(await reencryptEuint8(this.signers.alice, this.instance, handle, this.encryptedErrorsAddress)).to.be.eq(
      errorCode,
    );
    expect(await this.encryptedErrors.errorGetCounter()).to.be.eq(BigInt("1"));
  });

  it("errorChangeIfNot --> false --> change error code", async function () {
    // False --> change in errorCode
    const condition = false;
    const errorCode = 1;
    const targetErrorCode = 2;

    const input = this.instance.createEncryptedInput(this.encryptedErrorsAddress, this.signers.alice.address);
    const encryptedData = await input.addBool(condition).add8(errorCode).encrypt();

    await this.encryptedErrors
      .connect(this.signers.alice)
      .errorChangeIfNot(encryptedData.handles[0], encryptedData.handles[1], encryptedData.inputProof, targetErrorCode);

    const handle = await this.encryptedErrors.connect(this.signers.alice).errorGetCodeEmitted(0);
    expect(await reencryptEuint8(this.signers.alice, this.instance, handle, this.encryptedErrorsAddress)).to.be.eq(
      targetErrorCode,
    );
    expect(await this.encryptedErrors.errorGetCounter()).to.be.eq(BigInt("1"));
  });

  it("cannot deploy if totalNumberErrorCodes_ == 0", async function () {
    const numberErrors = 0;
    const contractFactory = await ethers.getContractFactory("TestEncryptedErrors");
    await expect(contractFactory.connect(this.signers.alice).deploy(numberErrors)).to.be.revertedWithCustomError(
      this.encryptedErrors,
      "TotalNumberErrorCodesEqualToZero",
    );
  });

  it("cannot define errors if indexCode is greater or equal than totalNumberErrorCodes", async function () {
    const condition = true;
    const targetErrorCode = (await this.encryptedErrors.errorGetNumCodesDefined()) + 1n;

    const input = this.instance.createEncryptedInput(this.encryptedErrorsAddress, this.signers.alice.address);
    const encryptedData = await input.addBool(condition).encrypt();

    await expect(
      this.encryptedErrors
        .connect(this.signers.alice)
        .errorDefineIf(encryptedData.handles[0], encryptedData.inputProof, targetErrorCode),
    ).to.be.revertedWithCustomError(this.encryptedErrors, "ErrorIndexInvalid");

    await expect(
      this.encryptedErrors
        .connect(this.signers.alice)
        .errorDefineIfNot(encryptedData.handles[0], encryptedData.inputProof, targetErrorCode),
    ).to.be.revertedWithCustomError(this.encryptedErrors, "ErrorIndexInvalid");
  });

  it("cannot define errors if indexCode is 0 or equal", async function () {
    const condition = true;
    const targetErrorCode = 0;

    const input = this.instance.createEncryptedInput(this.encryptedErrorsAddress, this.signers.alice.address);
    const encryptedData = await input.addBool(condition).encrypt();

    await expect(
      this.encryptedErrors
        .connect(this.signers.alice)
        .errorDefineIf(encryptedData.handles[0], encryptedData.inputProof, targetErrorCode),
    ).to.be.revertedWithCustomError(this.encryptedErrors, "ErrorIndexIsNull");

    await expect(
      this.encryptedErrors
        .connect(this.signers.alice)
        .errorDefineIfNot(encryptedData.handles[0], encryptedData.inputProof, targetErrorCode),
    ).to.be.revertedWithCustomError(this.encryptedErrors, "ErrorIndexIsNull");
  });

  it("cannot change errors if indexCode is greater or equal than totalNumberErrorCodes", async function () {
    const condition = true;
    const errorCode = 1;
    const targetErrorCode = (await this.encryptedErrors.errorGetNumCodesDefined()) + 1n;

    const input = this.instance.createEncryptedInput(this.encryptedErrorsAddress, this.signers.alice.address);
    const encryptedData = await input.addBool(condition).add8(errorCode).encrypt();

    await expect(
      this.encryptedErrors
        .connect(this.signers.alice)
        .errorChangeIf(encryptedData.handles[0], encryptedData.handles[1], encryptedData.inputProof, targetErrorCode),
    ).to.be.revertedWithCustomError(this.encryptedErrors, "ErrorIndexInvalid");

    await expect(
      this.encryptedErrors
        .connect(this.signers.alice)
        .errorChangeIfNot(
          encryptedData.handles[0],
          encryptedData.handles[1],
          encryptedData.inputProof,
          targetErrorCode,
        ),
    ).to.be.revertedWithCustomError(this.encryptedErrors, "ErrorIndexInvalid");
  });

  it("cannot call _errorGetCodeDefinition if indexCode is greater or equal than totalNumberErrorCodes", async function () {
    const indexCodeDefinition = await this.encryptedErrors.errorGetNumCodesDefined();

    await expect(
      this.encryptedErrors.connect(this.signers.alice).errorGetCodeDefinition(indexCodeDefinition),
    ).to.be.revertedWithCustomError(this.encryptedErrors, "ErrorIndexInvalid");
  });

  it("cannot call _errorGetCodeEmitted if errorId is greater than errorCounter", async function () {
    const errorCounter = await this.encryptedErrors.errorGetCounter();

    await expect(
      this.encryptedErrors.connect(this.signers.alice).errorGetCodeEmitted(errorCounter),
    ).to.be.revertedWithCustomError(this.encryptedErrors, "ErrorIndexInvalid");
  });
});
