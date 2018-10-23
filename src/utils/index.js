import jwt from "jsonwebtoken";
import crypto from "crypto";
import _ from "lodash";
import { query } from "./database";

const {
  token: { secret, expires }
} = require("../../config.json");

export function getRandomSalt() {
  return Math.random()
    .toString()
    .slice(2, 8);
}
export function encryptMd5(password, salt) {
  // md5实例每次都需要是个新的, 否则不重复执行update方法
  const md5 = crypto.createHash("md5");
  let _pw = password.split("");
  if (salt) {
    const _salt = salt.split("").reverse();
    _pw = _pw.map((w, i) => {
      return `${w}${_salt[i]}`;
    });
  }
  return md5.update(_pw.join("")).digest("hex");
}

export function resBody(data, msg = "success", code = 0) {
  return {
    msg,
    data,
    code
  };
}

export const dontNeedToken = [
  /^\/v\d\/login/,
  /^\/v\d\/registe/,
  /^((?!\/v\d).)*$/ // 设置除了私有接口外的其它资源，可以不需要认证访问
];
const checkUrlForAuthorNessery = (url, list) => !_.some(list, l => l.test(url));

export async function getUserByToken(ctx) {
  const token = ctx.header.authorization;
  const userKey = parseToken(token);
  const self = await query(
    `SELECT * FROM users WHERE id='${userKey.id}' limit 1`
  );
  return self[0];
}

export async function beforeRequest(ctx, next) {
  const needToken = checkUrlForAuthorNessery(ctx.url, dontNeedToken);
  if (needToken) {
    const user = await getUserByToken(ctx);
    if(user) {
      ctx.requester = user;
      await next();
    } else {
      ctx.body = resBody(null, "请求用户不存在", 1);
    }
  } else {
    await next();
  }
}

export function parseToken(token) {
  return jwt.verify(token.replace(/^Bearer\s/, ""), secret);
}

export function signToken(payload = {}) {
  return jwt.sign(payload, secret, { expiresIn: expires });
}
