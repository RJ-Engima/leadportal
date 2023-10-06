FROM node:12.18.1-alpine
ENV PORT=8080
WORKDIR /app
COPY package.json .
COPY . .
RUN npm install --legacy-peer-deps
RUN chown -R nobody:nobody /tmp && \
    chown -R nobody:nobody /home && \
    chown -R nobody:nobody /app
RUN chmod -R +x /app
EXPOSE $PORT
USER nobody
CMD ["npm", "start"]