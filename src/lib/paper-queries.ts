import { prisma } from "./prisma";

export interface PaperFilterParams {
  year?: number;
  region?: string;
  courseCode?: string;
  paperType?: string;
}

export async function getFilteredPapers(params: PaperFilterParams) {
  const where = {
    ...(params.year ? { year: params.year } : {}),
    ...(params.region ? { region: params.region } : {}),
    ...(params.courseCode ? { courseCode: params.courseCode } : {}),
    ...(params.paperType ? { paperType: params.paperType } : {}),
  };

  return await prisma.paper.findMany({
    where,
    include: {
      sections: {
        include: {
          tasks: {
            include: {
              _count: {
                select: { questions: true }
              }
            }
          }
        }
      }
    },
    orderBy: { createdAt: 'desc' }
  });
}

export function getStatusDisplay(status: string) {
  const statusMap: Record<string, { label: string, color: string }> = {
    draft: { label: "草稿", color: "bg-gray-200 text-gray-800" },
    partial_verified: { label: "部分核验", color: "bg-yellow-100 text-yellow-800" },
    verified: { label: "已核验", color: "bg-green-100 text-green-800" },
    blocked: { label: "阻止发布", color: "bg-red-100 text-red-800" },
  };
  return statusMap[status] || { label: status, color: "bg-gray-200 text-gray-800" };
}
