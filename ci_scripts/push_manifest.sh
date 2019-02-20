export IMAGE_TAG=`python ci_scripts/get_version.py`
export AARCH=`uname -m`
export IMAGE_NAME=xos-gui-builder
export DOCKER_CLI_EXPERIMENTAL=enabled

export IMAGE_NAME=xos-gui-builder
docker manifest create --amend cachengo/$IMAGE_NAME:$IMAGE_TAG cachengo/$IMAGE_NAME-x86_64:$IMAGE_TAG cachengo/$IMAGE_NAME-aarch64:$IMAGE_TAG
docker manifest push cachengo/$IMAGE_NAME:$IMAGE_TAG

export IMAGE_NAME=xos-gui
docker manifest create --amend cachengo/$IMAGE_NAME:$IMAGE_TAG cachengo/$IMAGE_NAME-x86_64:$IMAGE_TAG cachengo/$IMAGE_NAME-aarch64:$IMAGE_TAG
docker manifest push cachengo/$IMAGE_NAME:$IMAGE_TAG
