import fs from 'fs/promises';
import path from 'path';
import yaml from 'js-yaml'; // Assuming js-yaml is available or can be installed

export interface Step {
  name: string;
  tool: string;
  args: any;
}

export interface Skill {
  name: string;
  description: string;
  tools: string[];
  steps: Step[];
}

export class SkillRegistry {
  private static instance: SkillRegistry;
  private skills: Map<string, Skill> = new Map();

  private constructor() {}

  public static getInstance(): SkillRegistry {
    if (!SkillRegistry.instance) {
      SkillRegistry.instance = new SkillRegistry();
    }
    return SkillRegistry.instance;
  }

  public async loadSkills(directory: string) {
    const files = await fs.readdir(directory);
    for (const file of files) {
      if (file.endsWith('.yaml') || file.endsWith('.yml')) {
        const content = await fs.readFile(path.join(directory, file), 'utf-8');
        const skill = yaml.load(content) as Skill;
        this.skills.set(skill.name, skill);
      }
    }
  }

  public getSkill(name: string): Skill | undefined {
    return this.skills.get(name);
  }
}

export const skillRegistry = SkillRegistry.getInstance();
