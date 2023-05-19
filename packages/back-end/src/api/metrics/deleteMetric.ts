import { deleteMetricById, getMetricById } from "../../models/MetricModel";
import { createApiRequestHandler } from "../../util/handler";
import { deleteMetricValidator } from "../../validators/openapi";

export const getMetric = createApiRequestHandler(deleteMetricValidator)(
    async (req): Promise<DeleteMetricResponse> => {
      const metric = await getMetricById(
        req.params.id,
        req.organization.id,
        false,
      );
      if (!metric) {
        throw new Error("Could not find metric with that id");
      } else {
        await deleteMetricById(req.params.id, req.organization.id);
      }
  
      return {};
    }
  );
  