#!/usr/bin/env node
"use strict";
// Self-contained Skill helper: Node.js + a local Chrome/Chromium, no project dependencies.
const fs = require("node:fs/promises");
const constants = require("node:fs").constants;
const path = require("node:path");
const os = require("node:os");
const { execFile } = require("node:child_process");
const { promisify } = require("node:util");
const { pathToFileURL } = require("node:url");
const { createHash } = require("node:crypto");
const runFile = promisify(execFile);
const WIDTH = 1080, HEIGHT = 300;
const CODE = /^[ABCDEFGHJKMNPQRSTUVWXYZ23456789]{8}$/;
const PROD = "https://lzbird.genduiworks.com";
const TEST = "https://lzbird.test.genduiworks.com";
const HELP = `旅账鸟鸟 · HTML2Image 行程指引卡

node render-share-guide.cjs --source <CLI成功分享JSON> --output <新文件.png> [--browser <Chrome路径>]
lzbird-cli shares get --share <id> --json | node render-share-guide.cjs --stdin --output <新文件.png>

要求已开启分享且实际返回8位shortCode。默认仅接受正式环境；本地/测试验证加
--allow-non-production，卡片将醒目标注环境（原小程序码仍是正式版入口）。
需要本机Chrome/Chromium和中文字体，可用--browser或LZBIRD_CHROME指定。
不会覆盖已有文件、保存路书、开启分享或上传图片。`;

function fail(code, message) { const error = new Error(message); error.code = code; throw error; }
function parseArgs(args) {
  const value = {}, seen = new Set();
  for (let i = 0; i < args.length; i++) {
    const key = args[i];
    if (seen.has(key)) fail("INPUT_INVALID", "参数不能重复");
    seen.add(key);
    if (["--stdin", "--allow-non-production", "--help"].includes(key)) value[key] = true;
    else if (["--source", "--output", "--browser"].includes(key)) {
      if (!args[i + 1] || args[i + 1].startsWith("--")) fail("INPUT_INVALID", "参数缺少值");
      value[key] = args[++i];
    } else fail("INPUT_INVALID", "存在不支持的参数");
  }
  if (value["--help"]) return value;
  if (Boolean(value["--source"]) === Boolean(value["--stdin"])) fail("INPUT_INVALID", "请选择--source或--stdin，二者不能同时使用");
  if (!value["--output"] || !/\.png$/i.test(value["--output"])) fail("INPUT_INVALID", "请用--output指定新的PNG文件");
  return value;
}
function prepareGuide(response, allowNonProduction = false) {
  if (!response || response.ok !== true || !response.data || typeof response.data !== "object") fail("INPUT_INVALID", "需要CLI退出成功时的{ok:true,data}分享响应");
  const data = response.data;
  if (data.sharingEnabled !== true) fail("SHARE_DISABLED", "分享尚未开启，请勿生成可回流指引；工具不会自动开启分享");
  if (typeof data.shortCode !== "string" || !CODE.test(data.shortCode)) fail("CODE_MISSING", "响应未包含合法8位行程码，请重新完整读取已开启的分享");
  let origin;
  try { origin = new URL(data.shareUrl).origin; }
  catch { fail("INPUT_INVALID", "分享响应缺少有效shareUrl，无法核对行程码环境"); }
  const production = origin === PROD;
  if (!production && !allowNonProduction) fail("ENVIRONMENT_NOT_ALLOWED", "非正式分享不能直接配正式小程序入口；本地验证可显式加--allow-non-production");
  const environment = production ? "正式环境" : origin === TEST ? "测试环境" : "本地/非正式环境";
  return {
    shortCode: data.shortCode,
    formattedCode: data.shortCode.slice(0, 4) + " " + data.shortCode.slice(4),
    environment,
    production,
    warning: production ? "" : "测试预览 · 行程码仅在对应测试/本地环境有效",
  };
}
function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
}
async function findBrowser(explicit) {
  const paths = explicit ? [path.resolve(explicit)] : process.env.LZBIRD_CHROME ? [path.resolve(process.env.LZBIRD_CHROME)] : [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/usr/bin/google-chrome", "/usr/bin/chromium", "/usr/bin/chromium-browser", "/opt/google/chrome/chrome",
  ];
  for (const candidate of paths) {
    try { await fs.access(candidate, constants.X_OK); if ((await fs.stat(candidate)).isFile()) return candidate; } catch {}
  }
  fail("BROWSER_MISSING", "未找到本机Chrome/Chromium，请安装浏览器或用--browser指定实际可执行文件");
}
async function renderGuide(response, options) {
  const guide = prepareGuide(response, options.allowNonProduction);
  const output = path.resolve(options.output);
  try { await fs.lstat(output); fail("OUTPUT_EXISTS", "输出文件已存在，请换一个新文件名"); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
  const browser = await findBrowser(options.browser);
  const assets = path.join(__dirname, "../assets");
  const [template, qr] = await Promise.all([
    fs.readFile(path.join(assets, "share-guide.html"), "utf8"),
    fs.readFile(path.join(assets, "miniprogram-code.png")),
  ]);
  if (qr.length < 24 || !qr.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) || qr.readUInt32BE(16) !== 430 || qr.readUInt32BE(20) !== 430) fail("ASSET_INVALID", "Skill小程序码素材不是预期的430×430 PNG");
  const values = {
    QR_DATA_URL: "data:image/png;base64," + qr.toString("base64"),
    SHORT_CODE: escapeHtml(guide.formattedCode),
    WARNING: escapeHtml(guide.warning),
  };
  const html = template.replace(/\{\{([A-Z_]+)\}\}/g, (_, key) => {
    if (!Object.hasOwn(values, key)) fail("ASSET_INVALID", "指引模板含未知占位符");
    return values[key];
  });
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), "lzbird-share-guide-"));
  try {
    const page = path.join(temp, "guide.html"), screenshot = path.join(temp, "guide.png");
    await fs.writeFile(page, html, { mode: 0o600 });
    try {
      await runFile(browser, [
        "--headless=new", "--disable-gpu", "--hide-scrollbars", "--force-device-scale-factor=1",
        "--disable-background-networking", "--disable-component-update", "--disable-sync",
        "--disable-default-apps", "--disable-extensions", "--no-first-run", "--no-default-browser-check",
        "--user-data-dir=" + path.join(temp, "profile"), "--window-size=" + WIDTH + "," + HEIGHT,
        "--virtual-time-budget=3000", "--screenshot=" + screenshot, pathToFileURL(page).href,
      ], { timeout: 30000, maxBuffer: 2 * 1024 * 1024 });
    } catch { fail("RENDER_FAILED", "Chrome未能生成指引PNG；请核对浏览器和中文字体，不要使用失败文件"); }
    const png = await fs.readFile(screenshot);
    if (png.length < 24 || !png.subarray(0, 8).equals(Buffer.from("89504e470d0a1a0a", "hex")) || png.readUInt32BE(16) !== WIDTH || png.readUInt32BE(20) !== HEIGHT) fail("RENDER_FAILED", "指引图片尺寸或编码异常");
    await fs.mkdir(path.dirname(output), { recursive: true });
    try { await fs.writeFile(output, png, { flag: "wx", mode: 0o644 }); }
    catch (error) { if (error.code === "EEXIST") fail("OUTPUT_EXISTS", "输出文件已存在，未覆盖"); throw error; }
    return {
      output, width: WIDTH, height: HEIGHT, shortCode: guide.shortCode, environment: guide.environment,
      sha256: createHash("sha256").update(png).digest("hex"),
      qrSourceSha256: createHash("sha256").update(qr).digest("hex"),
      note: "卡片已生成；请打开核对，整张作为素材插入分享图，不让模型重画码图或行程码。未验证手机实扫。",
    };
  } finally { await fs.rm(temp, { recursive: true, force: true, maxRetries: 3, retryDelay: 100 }); }
}
async function main(args = process.argv.slice(2)) {
  const options = parseArgs(args);
  if (options["--help"]) { process.stdout.write(HELP + "\n"); return; }
  let raw;
  if (options["--stdin"]) {
    const chunks = []; for await (const chunk of process.stdin) chunks.push(Buffer.from(chunk));
    raw = Buffer.concat(chunks).toString("utf8");
  } else raw = await fs.readFile(path.resolve(options["--source"]), "utf8");
  let input;
  try { input = JSON.parse(raw); } catch { fail("INPUT_INVALID", "分享输入不是有效JSON"); }
  const data = await renderGuide(input, { output: options["--output"], browser: options["--browser"], allowNonProduction: Boolean(options["--allow-non-production"]) });
  process.stdout.write(JSON.stringify({ ok: true, data }) + "\n");
}
if (require.main === module) main().catch(error => {
  const known = ["INPUT_INVALID", "SHARE_DISABLED", "CODE_MISSING", "ENVIRONMENT_NOT_ALLOWED", "BROWSER_MISSING", "RENDER_FAILED", "OUTPUT_EXISTS", "ASSET_INVALID"].includes(error.code);
  process.stdout.write(JSON.stringify({ ok: false, code: known ? error.code : "LOCAL_FAILED", message: known ? error.message : "本机读写或运行失败，请核对输入文件、素材和输出目录" }) + "\n");
  process.exitCode = 2;
});
module.exports = { parseArgs, prepareGuide, renderGuide, main };
