import fs from "fs";
import path from "path";

import { encryptWithAES, generateAESKeyIV } from "../../utils/command-utils.js";
import {
  createPassword,
  getPasswordByPassUid,
  getPasswords,
  updatePasswordAES,
  updatePasswordCharset,
} from "./primistore-dao.js";
import {
  encryptWithCharset,
  generateCharset,
} from "../../utils/charset-utils.js";
import { PRIMISTORE_DIR } from "../../utils/path-utils.js";

const opensslNotInstalledError = (res) => {
  res.status(500).send({
    status: "OpenSSL not installed, cannot proceed!",
  });
};

const passwordCreationHandler = async (req, res) => {
  const password_uid = req.body.identifier;

  const { key, iv } = generateAESKeyIV();
  if (key === null || iv === null) {
    opensslNotInstalledError(res);
    return;
  }

  const charset = generateCharset();
  const charset_path = path.join(PRIMISTORE_DIR, `charset-${password_uid}.txt`);
  fs.writeFileSync(charset_path, charset);

  await createPassword(password_uid, key, iv);

  res.status(200).send({
    status: "success",
  });
};

const getAllPasswordsHandler = async (req, res) => {
  const passwords = await getPasswords();
  return res.status(200).send(passwords);
};

const rotateAESKeyIVHandler = async (req, res) => {
  const { pass_uid } = req.params;

  const { key, iv } = generateAESKeyIV();
  const updatedPassword = await updatePasswordAES(pass_uid, key, iv);

  res.status(200).send({
    password: updatedPassword,
  });
};

const rotateCharsetHandler = async (req, res) => {
  const { pass_uid } = req.params;

  const charsetPath = path.join(PRIMISTORE_DIR, `charset-${pass_uid}.txt`);
  const charset = generateCharset();

  fs.writeFileSync(charsetPath, charset);
  const updatedPassword = await updatePasswordCharset(pass_uid);

  res.status(200).send({
    updatedCharset: charset,
    password: updatedPassword,
  });
};

const encryptPasswordHandler = async (req, res) => {
  const { pass_uid } = req.params;
  const raw_password = req.body.password;

  const passwordDetails = await getPasswordByPassUid(pass_uid);
  const { aes_key, aes_iv } = passwordDetails;

  let encryptedPassword = encryptWithAES(aes_key, aes_iv, raw_password);
  const charsetPath = path.join(PRIMISTORE_DIR, `charset-${pass_uid}.txt`);
  let charset = fs
    .readFileSync(charsetPath)
    .toString("utf-8")
    .split("\n")
    .slice(0, -1);
  encryptedPassword = encryptWithCharset(charset, encryptedPassword);

  res.status(200).send({
    encryptedPassword,
  });
};

const PrimistoreController = (app) => {
  app.post("/password", passwordCreationHandler);
  app.get("/passwords", getAllPasswordsHandler);
  app.put("/password/aes/:pass_uid", rotateAESKeyIVHandler);
  app.put("/password/charset/:pass_uid", rotateCharsetHandler);
  app.post("/password/encrypt/:pass_uid", encryptPasswordHandler);
};

export default PrimistoreController;