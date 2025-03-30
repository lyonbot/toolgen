import { defineStore } from 'pinia';
import { computed, ref } from 'vue';
import Dexie from 'dexie';

export interface Project {
  id?: number;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
  files: Record<string, string>;
  artifacts: Record<string, Uint8Array>;
}

export interface ProjectInfo {
  id: number;
  title: string;
  description: string;
  createdAt: number;
  updatedAt: number;
}

class ProjectDatabase extends Dexie {
  projects!: Dexie.Table<Project, number>;

  constructor() {
    super('ProjectDatabase');
    this.version(1).stores({
      projects: '++id,title,createdAt,updatedAt'
    });
  }
}

const db = new ProjectDatabase();

export const useProjectsStore = defineStore('projects', () => {
  const currentProject = ref<Project | null>(null);
  const projectList = ref<ProjectInfo[]>([]);

  // 加载项目列表（不包含二进制数据）
  async function loadProjectList() {
    try {
      const projects = await db.projects.toArray();
      projectList.value = projects.map(({ id, title, description, createdAt, updatedAt }) => ({
        id: id!,
        title,
        description,
        createdAt,
        updatedAt
      }));
    } catch (error) {
      console.error('Failed to load project list:', error);
    }
  }

  // 创建新项目（只在内存中创建项目，不立即保存到数据库）
  async function newProject() {
    const project: Project = {
      title: '未命名项目',
      description: '',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      files: {
        '/src/index.jsx': `import dayjs from "dayjs";
import "./index.css";

const el = document.createElement("div");
el.className = "text-4xl font-bold rounded-lg max-w-md mx-auto bg-blue-500 text-white p-4 shadow-lg";
el.innerText = "hello world at " + dayjs().format("YYYY-MM-DD HH:mm:ss");
document.body.appendChild(el);
`,
        '/src/index.css': `
@tailwind base;
@tailwind components;
@tailwind utilities;
`
      },
      artifacts: {}
    };

    currentProject.value = project;
  }

  // 打开项目
  async function openProject(id: number) {
    try {
      const project = await db.projects.get(id);
      if (project) {
        currentProject.value = project;
      }
    } catch (error) {
      console.error('Failed to open project:', error);
      throw error; // 抛出错误，以便在调用处处理
    }
  }

  // 保存当前项目
  async function saveProject() {
    if (!currentProject.value) return;

    try {
      const project = { ...currentProject.value, updatedAt: Date.now() };

      // 如果项目已有ID，则更新；否则添加为新项目
      if (project.id) {
        await db.projects.update(project.id, project);
      } else {
        const id = await db.projects.add(project);
        currentProject.value.id = id;
      }

      await loadProjectList();
    } catch (error) {
      console.error('Failed to save project:', error);
    }
  }

  // 删除项目
  async function deleteProject(id: number) {
    try {
      await db.projects.delete(id);
      if (currentProject.value?.id === id) {
        newProject();
      }
      await loadProjectList();
    } catch (error) {
      console.error('Failed to delete project:', error);
    }
  }

  // 初始化
  newProject();
  loadProjectList();

  return {
    currentProject,
    projectList,
    newProject,
    openProject,
    saveProject,
    deleteProject,
  };
})
