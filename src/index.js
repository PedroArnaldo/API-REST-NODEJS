import { z } from "zod";
import Fastify from "fastify";

import createSummarization from "./queries/create-summarization.js";
import getSummarization from "./queries/get-summarization.js";
import deleteSummarization from "./queries/delete-summarization.js";
import updateSummarization from "./queries/update-summarization.js";
import { ValidateData } from "./class/validatedData.js";
import processVideo from "./services/videoProcessor.js";

const server = Fastify();

const audioSchema = z.object({
  title: z.string(),
  link: z
    .string()
    .regex(
      new RegExp(/https:\/\/www\.youtube\.com\/watch\?v=[a-zA-Z0-9_-]{11}/),
    ),
  startAt: z.number(),
  endAt: z.number(),
});

//verificar válidação do body
const validateBody = (request, reply, done) => {
  try {
    if (request.method === "POST" || request.method === "PUT") {
      if (Object.keys(request.body).length !== 4)
        throw "Body is invalid, check the body parameters.";

      const { title, link, startAt, endAt } = request.body;

      audioSchema.parse({ title, link, startAt, endAt });

      done();
    } else {
      done();
    }
  } catch (error) {
    return reply.status(500).send({ success: false, message: error });
  }
};

const validateId = (request, reply, done) => {
  if (request.method === "PUT" || request.method === "DELETE") {
    const { id } = request.params;

    const uuidv4Pattern =
      /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidv4Pattern.test(id)) {
      reply.code(400).send({ error: "Invalid UUID v4 ID" });
      return;
    }
    done();
  } else {
    done();
  }
};

server.addHook("preHandler", validateBody);
server.addHook("preHandler", validateId);

server.post("/summarization", async (request, response) => {
  try {
    const { title, link, startAt, endAt } = request.body;

    const validateData = new ValidateData(title, link, startAt, endAt);

    const newData = await processVideo(validateData);

    if (!newData.isValidInfo()) throw "Information sent is invalid";

    await createSummarization(newData);

    return response
      .status(201)
      .send({ message: "Successfully created summarization" });
  } catch (error) {
    return response.status(500).send({ success: false, message: error });
  }
});

server.get("/summarization", async (request, response) => {
  const summarization = await getSummarization();
  return response.status(200).send(summarization);
});

server.put("/summarization/:id", async (request, response) => {
  try {
    const summarizationId = request.params.id;
    const { title, link, startAt, endAt } = request.body;

    const newData = new ValidateData(title, link, startAt, endAt);

    const updateData = await processVideo(newData);

    await updateSummarization(summarizationId, updateData);

    return response
      .status(204)
      .send({ message: "Successfully updated summarization" });
  } catch (error) {
    return response.status(500).send({ message: error });
  }
});

server.delete("/summarization/:id", async (request, response) => {
  try {
    const summarizationId = request.params.id;
    await deleteSummarization(summarizationId);
    return response.status(200).send({ message: "successfully removed" });
  } catch (error) {
    return response.status(500).send({ message: error });
  }
});

server.listen({
  port: 3333,
});
