class L3Symbol(str):
    def ___eq__(self, other):
        if type(self) == type(other):
            return super().__eq__(other)
        return False


class L3String(str):
    def ___eq__(self, other):
        if type(self) == type(other):
            return super().__eq__(other)
        return False

EMPTY_LIST = L3Symbol("()")
def L3List(*argv):
    val = EMPTY_LIST
    for arg in reversed(argv):
        val = arg, val
    return val

