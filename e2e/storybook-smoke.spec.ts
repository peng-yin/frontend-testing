import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

type StoryEntry = {
  id: string;
  name: string;
  title: string;
  type: string;
};

const indexFile = path.resolve("storybook-static/index.json");
const index = JSON.parse(readFileSync(indexFile, "utf8")) as {
  entries: Record<string, StoryEntry>;
};
const stories = Object.values(index.entries).filter(
  (entry) => entry.type === "story",
);

test.describe("built Storybook smoke", () => {
  test("contains at least one story", () => {
    expect(stories.length).toBeGreaterThan(0);
  });

  for (const story of stories) {
    test(`${story.title} → ${story.name}`, async ({ page }) => {
      await page.goto(
        `/iframe.html?viewMode=story&id=${encodeURIComponent(story.id)}`,
      );

      const root = page.locator("#storybook-root");
      await expect(root).toBeAttached();
      await expect(page.locator(".sb-errordisplay")).toBeHidden();
      await expect
        .poll(async () => (await root.innerHTML()).trim().length)
        .toBeGreaterThan(0);
    });
  }
});
