import { test, expect } from "@playwright/test";
test("desktop, file lifecycle, terminal, editor, settings and windows", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  const files = page.getByRole("region", { name: "Files window" });
  await expect(files).toBeVisible();
  await expect(files.getByText("Documents", { exact: true })).toHaveCount(2);
  await files.getByRole("button", { name: "New folder" }).click();
  await files.getByPlaceholder("Folder name").fill("Test folder");
  await files.getByRole("button", { name: "Create", exact: true }).click();
  await expect(files.getByText("Test folder", { exact: true })).toBeVisible();
  await files.getByText("Test folder", { exact: true }).click();
  await files.getByRole("button", { name: "Rename", exact: true }).click();
  await files.getByRole("textbox").last().fill("Renamed folder");
  await files.getByRole("button", { name: "Save", exact: true }).click();
  await expect(
    files.getByText("Renamed folder", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Open Terminal", exact: true })
    .click();
  const terminal = page.getByRole("region", { name: "Terminal window" });
  const command = terminal.getByRole("textbox");
  await command.fill('echo "hello orbit" > /Documents/test.txt');
  await command.press("Enter");
  await command.fill("cat /Documents/test.txt");
  await command.press("Enter");
  await expect(terminal.locator("pre").last()).toHaveText("hello orbit");
  await command.fill("mkdir /Documents/work");
  await command.press("Enter");
  await command.fill("cp /Documents/test.txt /Documents/work");
  await command.press("Enter");
  await command.fill("ls /Documents/work");
  await command.press("Enter");
  await expect(terminal.locator("pre").last()).toContainText("test.txt");
  await command.fill("mv /Documents/work/test.txt /Documents/work/moved.txt");
  await command.press("Enter");
  await command.fill("cat /Documents/work/moved.txt");
  await command.press("Enter");
  await expect(terminal.locator("pre").last()).toHaveText("hello orbit");
  await command.fill("rm /Documents/work/moved.txt");
  await command.press("Enter");
  await command.fill("ls /Documents/work");
  await command.press("Enter");
  await expect(terminal.locator("pre").last()).toHaveText("(empty)");
  await page
    .getByRole("button", { name: "Close Terminal", exact: true })
    .click();
  await files.getByRole("button", { name: "Documents", exact: true }).click();
  await files.getByText("test.txt", { exact: true }).dblclick();
  const editor = page.getByRole("region", { name: "Text Editor window" });
  await expect(editor.getByLabel("Document content")).toHaveValue(
    "hello orbit",
  );
  await editor.getByLabel("Document content").fill("Saved through editor");
  await editor.getByRole("button", { name: "Save", exact: true }).click();
  await page.getByRole("button", { name: "Close Text Editor" }).click();
  await page
    .getByRole("button", { name: "Open Settings", exact: true })
    .click();
  await page.getByRole("button", { name: "After hours" }).click();
  await expect(page.locator(".desktop")).toHaveClass(/theme-dark/);
  await page.getByRole("button", { name: "Alpine dawn" }).click();
  await expect(page.locator(".wallpaper")).toHaveClass(/wallpaper-alpine/);
  await page.reload();
  await expect(page.locator(".desktop")).toHaveClass(/theme-dark/);
  await page.getByRole("button", { name: "Documents", exact: true }).click();
  await page.getByText("test.txt", { exact: true }).dblclick();
  await expect(page.getByLabel("Document content")).toHaveValue(
    "Saved through editor",
  );
  await page.getByRole("button", { name: "Maximize Text Editor" }).click();
  await expect(
    page.getByRole("region", { name: "Text Editor window" }),
  ).toHaveClass(/maximized/);
  await page.getByRole("button", { name: "Maximize Text Editor" }).click();
  await page.getByRole("button", { name: "Minimize Text Editor" }).click();
  await expect(
    page.getByRole("region", { name: "Text Editor window" }),
  ).toHaveCount(0);
  await page
    .getByRole("button", { name: "Open Text Editor", exact: true })
    .click();
  await expect(
    page.getByRole("region", { name: "Text Editor window" }),
  ).toBeVisible();
  expect(errors).toEqual([]);
});
test("all apps open, calculator works and layout fits mobile", async ({
  page,
}) => {
  await page.goto("/");
  await expect(
    page.getByRole("region", { name: "Files window" }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Close Files" }).click();
  await page.getByRole("button", { name: "Open app launcher" }).click();
  for (const name of [
    "Calculator",
    "Photos",
    "Music",
    "Video",
    "Browser",
    "System Monitor",
    "Notes",
    "App Store",
    "Settings",
    "Terminal",
    "Text Editor",
  ]) {
    await page
      .locator(".launcher-grid")
      .getByRole("button", { name, exact: true })
      .click();
    await expect(
      page.getByRole("region", { name: `${name} window` }),
    ).toBeVisible();
    if (name === "Calculator") {
      for (const k of ["2", "+", "3", "×", "4", "="])
        await page
          .locator(".calc-keys")
          .getByRole("button", { name: k, exact: true })
          .click();
      await expect(page.locator(".calc-output>span")).toHaveText("14");
    }
    await page
      .getByRole("button", { name: `Close ${name}`, exact: true })
      .click();
    await page.getByRole("button", { name: "Open app launcher" }).click();
  }
  await page.keyboard.press("Escape");
  await page.screenshot({ path: "tests/desktop.png", animations: "disabled" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole("button", { name: "Open Files", exact: true }).click();
  await expect(
    page.getByRole("region", { name: "Files window" }),
  ).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(
    390,
  );
  await page.screenshot({ path: "tests/mobile.png", animations: "disabled" });
});
test("window drag, resize, snap, context menu, notifications and notes persist", async ({
  page,
}) => {
  await page.goto("/");
  const win = page.getByRole("region", { name: "Files window" });
  await expect(win).toBeVisible();
  const before = await win.boundingBox();
  const title = win.locator(".window-app-title");
  const box = await title.boundingBox();
  await page.mouse.move(box!.x + 50, box!.y + 10);
  await page.mouse.down();
  await page.mouse.move(box!.x + 140, box!.y + 60, { steps: 8 });
  await page.mouse.up();
  const moved = await win.boundingBox();
  expect(moved!.x).toBeGreaterThan(before!.x + 50);
  const handle = await win.locator(".resize-se").boundingBox();
  await page.mouse.move(handle!.x + 4, handle!.y + 4);
  await page.mouse.down();
  await page.mouse.move(handle!.x + 70, handle!.y + 40, { steps: 5 });
  await page.mouse.up();
  expect((await win.boundingBox())!.width).toBeGreaterThan(moved!.width + 40);
  await page.getByRole("button", { name: "Snap Files" }).click();
  await page.getByRole("button", { name: "Left", exact: true }).click();
  expect((await win.boundingBox())!.x).toBe(8);
  await page.getByRole("button", { name: "Close Files" }).click();
  await page.mouse.click(900, 150, { button: "right" });
  await expect(
    page
      .locator(".context-menu")
      .getByRole("button", { name: "Change wallpaper" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open notifications" }).click();
  await expect(page.getByText("A fresh perspective")).toBeVisible();
  await page.getByRole("button", { name: "Clear all" }).click();
  await expect(page.getByText("You’re all caught up.")).toBeVisible();
  await page.keyboard.press("Escape");
  await page.getByRole("button", { name: "Open Notes", exact: true }).click();
  await page.getByLabel("Note title").fill("Persistent note");
  await page.getByLabel("Note body").fill("An idea worth keeping");
  await page.reload();
  await page.getByRole("button", { name: "Open Notes", exact: true }).click();
  await expect(page.getByLabel("Note title")).toHaveValue("Persistent note");
  await expect(page.getByLabel("Note body")).toHaveValue(
    "An idea worth keeping",
  );
});
