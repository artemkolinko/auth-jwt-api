CREATE DATABASE authdb;

CREATE TABLE public.users
(
    id uuid NOT NULL,
    name character varying(20) NOT NULL,
    password character varying(300) NOT NULL,
    PRIMARY KEY (name)
)

TABLESPACE pg_default;

ALTER TABLE public.users
    OWNER to hukfctuwsrjbvp;