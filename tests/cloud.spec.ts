import { test, expect, type Page } from "@playwright/test";
import { randomBytes } from "node:crypto";
const password = randomBytes(16).toString("hex");
async function launch(page: Page, name: string) {
  await page
    .getByRole("button", { name: "Open app launcher", exact: true })
    .click();
  await page
    .locator(".launcher-grid")
    .getByRole("button", { name, exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: `${name} window` }),
  ).toBeVisible();
}
async function login(page: Page, email: string) {
  await page.goto("/");
  await page.getByLabel("Email address").fill(email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page
    .getByRole("button", { name: "Enter your workspace", exact: true })
    .click();
  await expect(page.locator(".desktop")).toBeVisible();
}
async function logout(page: Page) {
  await launch(page, "Account");
  await page.getByRole("button", { name: "Sign out of this device" }).click();
  await expect(page.locator(".cloud-login")).toBeVisible();
}
test.describe.serial("hosted WebOS desktop", () => {
  test("desktop windows use hosted files, terminal, editor and protected sharing", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => {
      errors.push(e.message);
      console.log("Browser error:", e.message);
    });
    await page.goto("/");
    await page.getByLabel("Full name").fill("Alex Morgan");
    await page.getByLabel("Email address").fill("alex@example.test");
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .getByLabel("Workspace setup token")
      .fill(process.env.ORBIT_TEST_SETUP_TOKEN!);
    await page
      .getByRole("button", { name: "Create workspace", exact: true })
      .click();
    await expect(page.locator(".desktop")).toBeVisible();
    const files = page.getByRole("region", { name: "Files window" });
    await expect(
      files.locator(".file-name-cell").getByText("Documents", { exact: true }),
    ).toBeVisible();
    await files.locator("input[type=file]").setInputFiles({
      name: "Strategy.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("Our launch plan is ready."),
    });
    await files
      .getByRole("button", { name: "Strategy.txt", exact: true })
      .click();
    const editor = page.getByRole("region", { name: "Text Editor window" });
    await expect(editor.getByLabel("Document content")).toHaveValue(
      "Our launch plan is ready.",
    );
    await editor
      .getByLabel("Document content")
      .fill("Saved through hosted editor");
    await editor.getByRole("button", { name: "Save", exact: true }).click();
    await expect(editor.getByText("All changes saved")).toBeVisible();
    await page
      .getByRole("button", { name: "Close Text Editor", exact: true })
      .click();
    await launch(page, "Terminal");
    const terminal = page.getByRole("region", { name: "Terminal window" }),
      command = terminal.getByLabel("Terminal command");
    const run = async (s: string) => {
      await command.fill(s);
      await command.press("Enter");
    };
    await run("cat /Strategy.txt");
    await expect(terminal.locator("pre").last()).toHaveText(
      "Saved through hosted editor",
    );
    await run('echo "cloud terminal works" > /Documents/test.txt');
    await run("mkdir /Documents/work");
    await run("cp /Documents/test.txt /Documents/work/copied.txt");
    await run("cat /Documents/work/copied.txt");
    await expect(terminal.locator("pre").last()).toHaveText(
      "cloud terminal works",
    );
    await run("mv /Documents/work/copied.txt /Documents/work/moved.txt");
    await run("rm /Documents/work/moved.txt");
    await run("ls /Documents/work");
    await expect(terminal.locator("pre").last()).toHaveText("(empty)");
    await run("whoami");
    await expect(terminal.locator("pre").last()).toHaveText(
      "alex@example.test",
    );
    await page
      .getByRole("button", { name: "Close Terminal", exact: true })
      .click();
    await files
      .getByRole("button", { name: "Actions for Strategy.txt", exact: true })
      .click();
    await files
      .getByRole("button", { name: "Share file", exact: true })
      .click();
    await page.getByLabel("Password protection").fill("sharing-password");
    await page.getByLabel("Download limit").fill("3");
    await page.getByRole("button", { name: "Create share link" }).click();
    const url = await page.getByLabel("Share URL").inputValue();
    await page.getByRole("button", { name: "All done" }).click();
    const publicPage = await page.context().newPage();
    await publicPage.goto(url);
    await publicPage
      .getByPlaceholder("Enter the share password")
      .fill("sharing-password");
    await publicPage.getByRole("button", { name: "Unlock file" }).click();
    const download = publicPage.waitForEvent("download");
    await publicPage.getByRole("link", { name: "Download file" }).click();
    expect((await download).suggestedFilename()).toBe("Strategy.txt");
    await publicPage.close();
    await files
      .getByRole("button", { name: "New folder", exact: true })
      .click();
    await page.getByLabel("Folder name").fill("Launch");
    await page
      .getByRole("button", { name: "Save changes", exact: true })
      .click();
    await expect(
      files.getByRole("button", { name: "Launch", exact: true }),
    ).toBeVisible();
    const before = await files.boundingBox(),
      title = await files.locator(".window-app-title").boundingBox();
    await page.mouse.move(title!.x + 30, title!.y + 10);
    await page.mouse.down();
    await page.mouse.move(title!.x + 100, title!.y + 40, { steps: 8 });
    await page.mouse.up();
    expect((await files.boundingBox())!.x).toBeGreaterThan(before!.x + 30);
    for (const label of ["Dismiss message", "Dismiss toast"]) {
      const button = page.getByRole("button", { name: label, exact: true });
      if (await button.count()) await button.click();
    }
    const resizedBefore = await files.boundingBox(),
      handle = await files.locator(".resize-se").boundingBox();
    await page.mouse.move(handle!.x + 6, handle!.y + 6);
    await page.mouse.down();
    await page.mouse.move(handle!.x - 65, handle!.y - 35, { steps: 5 });
    await page.mouse.up();
    expect((await files.boundingBox())!.width).toBeLessThan(
      resizedBefore!.width - 30,
    );
    await page.getByRole("button", { name: "Snap Files", exact: true }).click();
    await page.getByRole("button", { name: "Left", exact: true }).click();
    expect((await files.boundingBox())!.x).toBe(8);
    await page
      .getByRole("button", { name: "Maximize Files", exact: true })
      .click();
    await expect(files).toHaveClass(/maximized/);
    await page
      .getByRole("button", { name: "Maximize Files", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Minimize Files", exact: true })
      .click();
    await expect(files).toHaveCount(0);
    await page.getByRole("button", { name: "Open Files", exact: true }).click();
    await expect(files).toBeVisible();
    await launch(page, "Settings");
    await page.getByRole("button", { name: "After hours" }).click();
    await expect(page.locator(".desktop")).toHaveClass(/theme-dark/);
    await page.getByRole("button", { name: "Alpine dawn" }).click();
    await page
      .getByRole("button", { name: "Close Settings", exact: true })
      .click();
    await page.reload();
    await expect(page.locator(".desktop")).toHaveClass(/theme-dark/);
    await expect(page.locator(".wallpaper")).toHaveClass(/wallpaper-alpine/);
    await files
      .getByRole("button", { name: "Strategy.txt", exact: true })
      .click();
    await expect(page.getByLabel("Document content")).toHaveValue(
      "Saved through hosted editor",
    );
    await page
      .getByRole("button", { name: "Close Text Editor", exact: true })
      .click();
    await files.locator(".hosted-content").evaluate((e) => (e.scrollTop = 0));
    await page.screenshot({
      path: "/tmp/orbit-hosted-desktop.png",
      animations: "disabled",
    });
    await launch(page, "Notes");
    await page.getByLabel("Note title").fill("Alex private note");
    await page.getByLabel("Note body").fill("Only in Alex’s local desktop");
    await page
      .getByRole("button", { name: "Close Notes", exact: true })
      .click();
    await logout(page);
    await page
      .getByRole("button", { name: "Create an account", exact: true })
      .click();
    await page.getByLabel("Full name").fill("Sam Rivers");
    await page.getByLabel("Email address").fill("sam@example.test");
    await page.getByLabel("Password", { exact: true }).fill(password);
    await page
      .getByRole("button", { name: "Create account", exact: true })
      .click();
    await expect(page.locator(".desktop")).toHaveClass(/theme-light/);
    await expect(
      files.getByRole("button", { name: "Strategy.txt", exact: true }),
    ).toHaveCount(0);
    await launch(page, "Notes");
    await expect(page.getByLabel("Note title")).not.toHaveValue(
      "Alex private note",
    );
    await page
      .getByRole("button", { name: "Close Notes", exact: true })
      .click();
    await logout(page);
    expect(errors).toEqual([]);
  });
  test("members get private desktops, permissions and mobile layout", async ({
    page,
  }) => {
    await login(page, "sam@example.test");
    await expect(page.locator(".desktop")).toHaveClass(/theme-light/);
    const files = page.getByRole("region", { name: "Files window" });
    await expect(
      files.locator(".file-name-cell").getByText("Documents", { exact: true }),
    ).toBeVisible();
    await expect(
      files.getByRole("button", { name: "Strategy.txt", exact: true }),
    ).toHaveCount(0);
    await page.getByRole("button", { name: "Open app launcher" }).click();
    await expect(
      page
        .locator(".launcher-grid")
        .getByRole("button", { name: "Admin Console", exact: true }),
    ).toHaveCount(0);
    await page.keyboard.press("Escape");
    expect((await page.request.get("/api/admin/overview")).status()).toBe(403);
    await launch(page, "Notes");
    await expect(page.getByLabel("Note title")).not.toHaveValue(
      "Alex private note",
    );
    await page
      .getByRole("button", { name: "Close Notes", exact: true })
      .click();
    await page.reload();
    await expect(page.locator(".desktop")).toBeVisible();
    await page.setViewportSize({ width: 390, height: 844 });
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth),
    ).toBe(390);
    await expect(files).toBeVisible();
    await page.screenshot({
      path: "/tmp/orbit-hosted-mobile.png",
      animations: "disabled",
    });
    await logout(page);
  });
  test("admin console and all desktop apps open in windows", async ({
    page,
  }) => {
    await login(page, "alex@example.test");
    await launch(page, "Admin Console");
    await expect(
      page.getByRole("heading", { name: /Workspace control/ }),
    ).toBeVisible();
    await page.screenshot({
      path: "/tmp/orbit-hosted-admin.png",
      animations: "disabled",
    });
    const adminWindow = page.getByRole("region", {
      name: "Admin Console window",
    });
    await adminWindow
      .getByRole("button", { name: "Settings", exact: true })
      .click();
    await adminWindow
      .getByLabel("Workspace name", { exact: true })
      .fill("Orbit Studio");
    await adminWindow
      .getByRole("switch", { name: "Open registration" })
      .click();
    await adminWindow
      .getByRole("button", { name: "Save settings", exact: true })
      .click();
    await expect(page.locator(".topbar .brand b")).toHaveText("Orbit Studio");
    await expect
      .poll(
        async () =>
          (await (await page.request.get("/api/auth/status")).json())
            .registrationEnabled,
      )
      .toBe(false);
    await page
      .getByRole("button", { name: "Close Admin Console", exact: true })
      .click();
    for (const name of [
      "Calculator",
      "Photos",
      "Music",
      "Video",
      "Browser",
      "System Monitor",
      "Notes",
      "App Store",
      "Sharing",
      "Account",
    ]) {
      await launch(page, name);
      if (name === "Calculator") {
        for (const k of ["2", "+", "3", "×", "4", "="])
          await page
            .locator(".calc-keys")
            .getByRole("button", { name: k, exact: true })
            .click();
        await expect(page.locator(".calc-output>span")).toHaveText("14");
      }
      if (name === "Account") {
        await page
          .getByRole("region", { name: "Account window" })
          .getByRole("button", { name: "After hours" })
          .click();
        await expect(page.locator(".desktop")).toHaveClass(/theme-dark/);
        await expect(page.locator("html")).toHaveAttribute(
          "data-cloud-theme",
          "dark",
        );
      }
      await page
        .getByRole("button", { name: `Close ${name}`, exact: true })
        .click();
    }
  });
});

test("unavailable API shows a useful error and retry recovers", async ({
  page,
}) => {
  await page.route("**/api/auth/status", (route) =>
    route.fulfill({
      status: 404,
      contentType: "text/plain",
      body: "The page could not be found",
    }),
  );
  await page.goto("/");
  await expect(
    page.getByText(/The workspace server is unavailable/),
  ).toBeVisible();
  await expect(page.getByText(/Unexpected token/)).toHaveCount(0);
  await page.unroute("**/api/auth/status");
  await page.getByRole("button", { name: "Try again" }).click();
  await expect(page.locator(".cloud-login")).toBeVisible();
});
